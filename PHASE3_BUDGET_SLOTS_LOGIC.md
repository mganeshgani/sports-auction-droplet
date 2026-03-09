# PHASE 3 — FIX ALL BUDGET, SLOT & CALCULATION BUGS + ATOMIC TRANSACTIONS
### Based on Phase 0 Audit · Requires Phases 1 and 2 to be fully complete

---

> **GOAL OF THIS PHASE:**
> Every number shown in the app — remaining budget, filled slots, total spent, results totals —
> must be 100% accurate, computed from the database, and impossible to get wrong due to race conditions.
> No number should ever be calculated on the frontend or stored as a running counter.

---

## The Core Problem (from Phase 0 Audit)

The audit found three compounding issues:

1. **`assignPlayer` uses `Promise.all([player.save(), team.save()])`** — not atomic.
   If `player.save()` succeeds but `team.save()` fails (or vice versa), data becomes permanently inconsistent: a player shows as "sold" but the team has no record of them, or the team's budget is wrong.

2. **`team.filledSlots` is maintained as a counter** (`team.filledSlots = team.players.length`).
   Under concurrent requests (two auctioneers selling players simultaneously), this counter drifts.
   The array of player ObjectIds and the counter become out of sync.

3. **`team.remainingBudget` is stored as a field and decremented.**
   Again, under concurrent updates, the stored value drifts from reality.
   There is no re-derivation from actual sold amounts.

**The fix:** Use MongoDB transactions for all sell operations. Always compute budget and slot counts live from the database — never trust stored counter fields.

---

## Step 3.1 — Enable MongoDB Transactions (Required for Atlas)

MongoDB transactions require a replica set. MongoDB Atlas (which this app uses) supports transactions by default.

Open `backend/config/db.js` (or wherever Mongoose connects).
Confirm the connection string points to Atlas and includes the replica set parameter. Atlas connection strings already include this.

No code change needed here — just confirm Atlas is being used and not a local standalone MongoDB (standalone MongoDB doesn't support transactions).

Add a comment in the connection config:
```javascript
// Using MongoDB Atlas — transactions are supported via replica set
// Required for atomic player assignment operations
```

---

## Step 3.2 — Rewrite `assignPlayer` with MongoDB Transaction + Live Recalculation

Open `backend/controllers/player.controller.js`.
Find the `assignPlayer` function.

**Replace the entire function body** with this transaction-based implementation:

```javascript
const assignPlayer = async (req, res) => {
  const playerId = req.params.playerId;  // Fixed in Phase 1 (B3)
  const { teamId, amount } = req.body;

  if (!playerId) return res.status(400).json({ message: 'Player ID is required' });
  if (!teamId) return res.status(400).json({ message: 'Team ID is required' });
  if (!amount || amount < 0) return res.status(400).json({ message: 'Valid bid amount is required' });

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      // --- LOCK AND FETCH BOTH DOCUMENTS WITHIN THE TRANSACTION ---
      const player = await Player.findById(playerId).session(session);
      const team = await Team.findById(teamId).session(session);

      if (!player) throw new Error('Player not found');
      if (!team) throw new Error('Team not found');
      if (player.status !== 'available') throw new Error('Player is not available for sale');

      // --- COMPUTE LIVE SLOT COUNT (never trust team.filledSlots) ---
      const filledSlots = team.players.length;  // Array length is the truth
      if (filledSlots >= team.totalSlots) {
        throw new Error(`Team "${team.name}" has no remaining slots (${filledSlots}/${team.totalSlots})`);
      }

      // --- COMPUTE LIVE REMAINING BUDGET (never trust team.remainingBudget) ---
      // Remaining = initial budget minus sum of all soldAmounts for players on this team
      const budgetUsed = await Player.aggregate([
        { $match: { team: team._id, status: 'sold' } },
        { $group: { _id: null, total: { $sum: '$soldAmount' } } }
      ]).session(session);
      const totalSpent = budgetUsed[0]?.total || 0;
      const remainingBudget = (team.budget || 0) - totalSpent;

      if (team.budget && amount > remainingBudget) {
        throw new Error(`Insufficient budget. Team "${team.name}" has ₹${remainingBudget} remaining, bid is ₹${amount}`);
      }

      // --- APPLY CHANGES ---
      player.status = 'sold';
      player.team = team._id;
      player.soldAmount = amount;

      team.players.push(player._id);
      // Recompute and STORE the derived fields for read convenience
      // (they are still recomputed live on every write — never trusted on reads)
      team.filledSlots = team.players.length;
      team.remainingBudget = remainingBudget - amount;

      await player.save({ session });
      await team.save({ session });

      result = { player, team, remainingBudget: team.remainingBudget };
    });

    // Broadcast the update to the auctioneer's room (Socket.io)
    const io = req.app.get('io');
    if (io) {
      const auctioneerId = result.player.auctioneer?.toString();
      if (auctioneerId) {
        io.to(`auctioneer_${auctioneerId}`).emit('playerSold', {
          player: result.player,
          team: result.team,
        });
      }
    }

    return res.status(200).json({
      message: 'Player assigned successfully',
      player: result.player,
      team: result.team,
    });

  } catch (err) {
    // Transaction automatically aborted on error
    const userMessage = err.message.includes('no remaining slots') ||
                        err.message.includes('Insufficient budget') ||
                        err.message.includes('not available')
      ? err.message
      : 'Failed to assign player. Please try again.';
    return res.status(400).json({ message: userMessage });
  } finally {
    session.endSession();
  }
};
```

Make sure `mongoose` is imported at the top of the file:
```javascript
const mongoose = require('mongoose');
```

---

## Step 3.3 — Rewrite `removePlayerFromTeam` with Transaction

Find the function that removes a player from a team (likely `removePlayerFromTeam` or similar in `player.controller.js` or `team.controller.js`).

Apply the same transaction pattern:
```javascript
const session = await mongoose.startSession();
await session.withTransaction(async () => {
  const player = await Player.findById(playerId).session(session);
  const team = await Team.findById(player.team).session(session);

  player.status = 'available';
  player.team = null;
  player.soldAmount = 0;

  team.players = team.players.filter(id => id.toString() !== playerId);
  team.filledSlots = team.players.length;

  // Recompute remaining budget after removal
  const budgetUsed = await Player.aggregate([
    { $match: { team: team._id, status: 'sold' } },
    { $group: { _id: null, total: { $sum: '$soldAmount' } } }
  ]).session(session);
  team.remainingBudget = (team.budget || 0) - (budgetUsed[0]?.total || 0);

  await player.save({ session });
  await team.save({ session });
});
session.endSession();
```

---

## Step 3.4 — Create a `getTeamSummary` Helper (Single Source of Truth)

Create a new file: `backend/utils/teamSummary.js`

```javascript
const Player = require('../models/player.model');

/**
 * Computes live, accurate team stats from the database.
 * Always call this after any player assignment/removal instead of trusting stored counters.
 */
async function getTeamSummary(team) {
  const soldPlayers = await Player.find({ team: team._id, status: 'sold' }, 'name soldAmount photoUrl regNo');

  const totalSpent = soldPlayers.reduce((sum, p) => sum + (p.soldAmount || 0), 0);
  const remainingBudget = (team.budget || 0) - totalSpent;
  const filledSlots = soldPlayers.length;
  const remainingSlots = team.totalSlots - filledSlots;

  return {
    _id: team._id,
    name: team.name,
    logoUrl: team.logoUrl,
    budget: team.budget,
    remainingBudget,
    totalSpent,
    totalSlots: team.totalSlots,
    filledSlots,
    remainingSlots,
    players: soldPlayers,
    isFull: filledSlots >= team.totalSlots,
    budgetExhausted: remainingBudget <= 0,
  };
}

module.exports = { getTeamSummary };
```

Import and use this in:
- `getAllTeams` controller — call `getTeamSummary` for each team before returning
- `getTeam` (single team) controller
- Any endpoint that returns team data with budget/slot info

---

## Step 3.5 — Fix `getAllTeams` to Return Live-Computed Stats

Open the teams controller (`backend/controllers/team.controller.js`).
Find `getAllTeams`.

Replace any code that returns `team.remainingBudget` or `team.filledSlots` from the stored fields with a call to `getTeamSummary`:

```javascript
const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find({ auctioneer: req.user._id }).sort({ createdAt: 1 });

    const { getTeamSummary } = require('../utils/teamSummary');
    const teamsWithStats = await Promise.all(teams.map(team => getTeamSummary(team)));

    return res.status(200).json({ teams: teamsWithStats });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch teams' });
  }
};
```

---

## Step 3.6 — Create a `getAuctionResults` Endpoint

This is for the results page. It must aggregate everything in ONE query — not accumulated state.

Add this endpoint to the player or auction controller:

```javascript
const getAuctionResults = async (req, res) => {
  const auctioneerId = req.user._id;

  try {
    // Aggregate all sold players grouped by team
    const soldByTeam = await Player.aggregate([
      { $match: { auctioneer: mongoose.Types.ObjectId(auctioneerId), status: 'sold' } },
      {
        $group: {
          _id: '$team',
          playerCount: { $sum: 1 },
          totalSpent: { $sum: '$soldAmount' },
          players: { $push: { name: '$name', soldAmount: '$soldAmount', regNo: '$regNo', photoUrl: '$photoUrl' } }
        }
      },
      {
        $lookup: {
          from: 'teams',
          localField: '_id',
          foreignField: '_id',
          as: 'teamInfo'
        }
      },
      { $unwind: '$teamInfo' },
      {
        $project: {
          teamName: '$teamInfo.name',
          logoUrl: '$teamInfo.logoUrl',
          budget: '$teamInfo.budget',
          totalSlots: '$teamInfo.totalSlots',
          playerCount: 1,
          totalSpent: 1,
          remainingBudget: { $subtract: ['$teamInfo.budget', '$totalSpent'] },
          remainingSlots: { $subtract: ['$teamInfo.totalSlots', '$playerCount'] },
          players: 1
        }
      },
      { $sort: { totalSpent: -1 } }
    ]);

    const totalPlayers = await Player.countDocuments({ auctioneer: auctioneerId });
    const soldPlayers = await Player.countDocuments({ auctioneer: auctioneerId, status: 'sold' });
    const unsoldPlayers = await Player.countDocuments({ auctioneer: auctioneerId, status: 'unsold' });
    const availablePlayers = await Player.countDocuments({ auctioneer: auctioneerId, status: 'available' });

    const totalMoneySpent = soldByTeam.reduce((sum, t) => sum + t.totalSpent, 0);

    return res.status(200).json({
      summary: {
        totalPlayers,
        soldPlayers,
        unsoldPlayers,
        availablePlayers,
        totalMoneySpent,
        totalTeams: soldByTeam.length,
      },
      teams: soldByTeam
    });

  } catch (err) {
    console.error('getAuctionResults error:', err);
    return res.status(500).json({ message: 'Failed to compute results' });
  }
};
```

Register this route: `GET /api/players/results` (protected, auctioneer only).

---

## Step 3.7 — Fix N+1 Query in `getAllAuctioneers`

From the audit: `getAllAuctioneers` calls `countDocuments` twice per auctioneer in a loop.

Open `backend/controllers/admin.controller.js`.
Find `getAllAuctioneers`.
Replace the per-auctioneer count calls with a single aggregation:

```javascript
// Replace the N+1 loop with:
const [playerCounts, teamCounts] = await Promise.all([
  Player.aggregate([
    { $match: { auctioneer: { $in: auctioneers.map(a => a._id) } } },
    { $group: { _id: '$auctioneer', count: { $sum: 1 } } }
  ]),
  Team.aggregate([
    { $match: { auctioneer: { $in: auctioneers.map(a => a._id) } } },
    { $group: { _id: '$auctioneer', count: { $sum: 1 } } }
  ])
]);

// Build lookup maps
const playerCountMap = Object.fromEntries(playerCounts.map(p => [p._id.toString(), p.count]));
const teamCountMap = Object.fromEntries(teamCounts.map(t => [t._id.toString(), t.count]));

// Attach counts to each auctioneer
const result = auctioneers.map(a => ({
  ...a.toObject(),
  playerCount: playerCountMap[a._id.toString()] || 0,
  teamCount: teamCountMap[a._id.toString()] || 0,
}));
```

This goes from O(N) queries to O(1) regardless of how many auctioneers there are.

---

## Step 3.8 — Add Pagination to All List Endpoints

The following endpoints return full collections with no limit (from the audit):
- `getAllPlayers`
- `getAllTeams`
- `getUnsoldPlayers`
- `getAllAuctioneers`

**For `getAllPlayers` (most critical — 1,000+ records):**

```javascript
const getAllPlayers = async (req, res) => {
  const { page = 1, limit = 50, status, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const query = { auctioneer: req.user._id };
  if (status) query.status = status;
  if (search) query.name = { $regex: search, $options: 'i' };

  const [players, total] = await Promise.all([
    Player.find(query)
      .select('name regNo photoUrl status soldAmount team class position customFields createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),  // .lean() returns plain JS objects instead of Mongoose docs — much faster for reads
    Player.countDocuments(query)
  ]);

  return res.status(200).json({
    players,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      hasMore: skip + players.length < total
    }
  });
};
```

**For the frontend:** Update the player fetching hook/service to:
- Accept `page` and `limit` params
- Pass them to the API
- Use `hasMore` to implement "Load More" or infinite scroll

Keep the default `limit=50` on all list endpoints. Never return more than 100 records at once.

---

## Verification After Phase 3

**Test 1 — Atomic assignment:**
1. Assign a player to a team
2. Check the database directly: player.status === 'sold', player.team === teamId, player.soldAmount === amount
3. Check team: team.players array contains the player _id, team.filledSlots === team.players.length

**Test 2 — Budget accuracy:**
1. Create a team with budget ₹10,000
2. Sell player A for ₹3,000 → team should show ₹7,000 remaining
3. Sell player B for ₹4,000 → team should show ₹3,000 remaining
4. Try to sell player C for ₹5,000 → should be BLOCKED with "Insufficient budget" error
5. Verify: remaining budget shown in UI matches database reality exactly

**Test 3 — Slot accuracy:**
1. Create a team with 3 slots
2. Sell 3 players to it → team shows 3/3 (FULL)
3. Try to sell a 4th player to it → should be BLOCKED with "No remaining slots" error
4. Remove one player → team shows 2/3 → budget recalculates correctly
5. Sell the 4th player now → succeeds

**Test 4 — Results page:**
1. Sell 5 players to various teams
2. Load the results page
3. Confirm: total sold count, total money spent, per-team breakdowns all match the database exactly
4. Remove a player from a team and reload results → numbers update immediately

**Test 5 — Pagination:**
1. Create 60+ players
2. Call `GET /api/players` with no params → should return 50 players + pagination metadata
3. Call with `?page=2` → should return the next batch

---

**When Phase 3 is complete, confirm:**
- List every file changed
- Transaction is used for all player assignment/removal operations
- `getTeamSummary` helper is used everywhere team stats are returned
- `getAuctionResults` endpoint exists and returns correct aggregated data
- All 5 verification tests pass

Then wait for Phase 4 instructions.
