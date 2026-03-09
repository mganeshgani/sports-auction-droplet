# PHASE 1 — FIX ALL CRITICAL & HIGH BUGS
### Based on Phase 0 Audit · Fix in exact file order listed below · No skipping

---

> **BEFORE YOU START:**
> Re-read the Phase 0 audit report fully.
> Fix bugs in the exact order listed below — later fixes depend on earlier ones.
> After every fix, state: which file was changed, what line(s), and what changed.
> Do NOT refactor anything outside the scope of each fix. Stay surgical.

---

## FIX B2 FIRST — Socket Room Join Silently Fails (This breaks ALL real-time features)

**Why first:** Every real-time feature in the app is broken because of this. Players sold, teams updated, bids placed — none of these are delivered to clients. Fix this before anything else.

**Root Cause (from audit):**
- `backend/controllers/auth.controller.js` line 128 sends `{ id: user._id }` in the JWT/response.
- `frontend/src/services/socket.ts` line 224 checks for `user._id` or `user.userId` — never `user.id`.
- The stored user object uses `id` (not `_id`), so `joinAuctioneer` never fires.

**What to fix:**

Step 1 — Open `frontend/src/services/socket.ts`.
Find the `joinAuctioneer` logic. Find the line that reads `user._id` or `user.userId`.
Change it to also check `user.id`. The correct lookup must be:
```javascript
const userId = user?._id || user?.userId || user?.id;
```
Make sure `joinAuctioneer` is only emitted when `userId` is not null/undefined. Add a console.warn if userId is still undefined after all checks, so it's visible in dev.

Step 2 — Open `backend/controllers/auth.controller.js` line 128.
Ensure the response object returns BOTH `id` and `_id` pointing to the same value, so any frontend variation works:
```javascript
// In the login/register response, include both:
id: user._id,
_id: user._id,
```
This is a backwards-compatible fix — no other changes needed.

Step 3 — Test: After login, open browser console. Confirm you see a Socket.io `joinAuctioneer` event emitted with a valid user ID. Confirm the server logs the room join.

---

## FIX B3 — `assignPlayer` Reads `playerId` from Wrong Source (Player sell is completely broken)

**Root Cause (from audit):**
- Route: `POST /:playerId/assign` — playerId is in the URL param.
- `backend/controllers/player.controller.js` line 166 does: `const { playerId, teamId, amount } = req.body`.
- `playerId` from `req.body` will always be `undefined` — it's in `req.params`.

**What to fix:**

Open `backend/controllers/player.controller.js`.
Find the `assignPlayer` function (around line 166).
Change the destructuring from:
```javascript
const { playerId, teamId, amount } = req.body;
```
To:
```javascript
const playerId = req.params.playerId;
const { teamId, amount } = req.body;
```

Also: Add a guard immediately after:
```javascript
if (!playerId) return res.status(400).json({ message: 'Player ID is required' });
if (!teamId) return res.status(400).json({ message: 'Team ID is required' });
```

Do not change anything else in this function yet — budget/slot fixes come in Phase 3.

---

## FIX B1 — Privilege Escalation: Anyone Can Register as Admin (Critical Security)

**Root Cause (from audit):**
- `backend/controllers/auth.controller.js` line 34: `role: role || 'auctioneer'`
- A user can POST `{"role": "admin"}` to the register endpoint and become an admin.

**What to fix:**

Open `backend/controllers/auth.controller.js`.
Find line 34. Change:
```javascript
role: role || 'auctioneer'
```
To:
```javascript
role: 'auctioneer'  // Role is NEVER taken from request body. Always default to auctioneer.
```
Remove `role` from the destructuring of `req.body` in the register function entirely.
Admin accounts must ONLY be created directly in the database or via a separate seeder script — never via the public API.

Add a comment above this line: `// SECURITY: role is hardcoded. Never accept role from client.`

---

## FIX B4 — CORS Effectively Disabled in Production

**Root Cause (from audit):**
- `backend/server.js` line 147: The `else` branch calls `callback(null, true)` for ALL origins, even blocked ones.
- This comment says "Allow all for development" but it runs in production.

**What to fix:**

Open `backend/server.js`.
Find the Express CORS middleware function (around line 140–150).
Find the `else` branch that calls `callback(null, true)`.
Change it to:
```javascript
} else {
  callback(new Error(`CORS: Origin ${origin} not allowed`), false);
}
```

Also fix B15 at the same time — the regex wildcard inconsistency:
Find both places where `allowedOrigin.replace(...)` is called.
Make them use the exact same replacement logic:
```javascript
// Standardize to this in BOTH the Express CORS handler AND the Socket.io handler:
const pattern = allowedOrigin.replace(/\*/g, '.*');
const regex = new RegExp(`^${pattern}$`);
return regex.test(origin);
```
Make sure this one helper function is reused in both places so they can never diverge again.

---

## FIX B9 — Hardcoded Fallback JWT Secret

**Root Cause (from audit):**
- `backend/middleware/auth.middleware.js` line 5: `JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'`
- If the env var is missing, all tokens use a public, predictable secret.

**What to fix:**

Open `backend/middleware/auth.middleware.js`.
Change:
```javascript
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';
```
To:
```javascript
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Server will not start.');
  process.exit(1);
}
```
The app must refuse to start without a real secret — a hardcoded fallback is a security vulnerability.

Do the same check at the top of `auth.controller.js` wherever JWT is signed.

---

## FIX B7 — `AuctionContext` Kills the Shared Socket on Unmount

**Root Cause (from audit):**
- `frontend/src/contexts/AuctionContext.tsx` line 87: `useEffect` cleanup calls `socketInstance.disconnect()`.
- This destroys the shared singleton socket used by ALL components.
- After any remount (page navigation, HMR), the socket is permanently dead.

**What to fix:**

Open `frontend/src/contexts/AuctionContext.tsx`.
Find the `useEffect` cleanup function (around line 87).
Remove the `socketInstance.disconnect()` call from the cleanup.
The singleton socket must ONLY be disconnected by the auth logout flow, never by component unmount.

Replace the cleanup with:
```javascript
return () => {
  // Only remove listeners added by this context — do NOT disconnect the shared socket
  socket.off('playerSold');
  socket.off('playerUpdated');
  // ... remove only the specific listeners this useEffect added
};
```
List out and remove only the specific event listeners that THIS context's useEffect added. Do not touch the socket connection itself.

---

## FIX B6 — `isAuctioneer` Flag is True for Admins (Logic Confusion)

**Root Cause (from audit):**
- `frontend/src/contexts/AuthContext.tsx` line 148: `isAuctioneer: user?.role === 'admin' || user?.role === 'auctioneer'`
- Admins incorrectly get auctioneer UI/permissions.

**What to fix:**

Open `frontend/src/contexts/AuthContext.tsx`.
Change:
```javascript
isAuctioneer: user?.role === 'admin' || user?.role === 'auctioneer'
```
To:
```javascript
isAuctioneer: user?.role === 'auctioneer',
isAdmin: user?.role === 'admin',
```

Then search the entire frontend (`grep -r "isAuctioneer"`) and for each place it's used, confirm whether it should be `isAuctioneer` OR `isAdmin` OR `isAuctioneer || isAdmin`. Fix each usage to use the correct flag.

---

## FIX B8 — No Player Limit Check on Public Registration Endpoint

**Root Cause (from audit):**
- `backend/controllers/player.controller.js` lines 7–115: `registerPlayer` (the public registration endpoint used via registration link) never checks `maxPlayers`.
- Only `createPlayer` (admin panel) checks limits.
- Players can register via the public link beyond the auctioneer's set limit.

**What to fix:**

Open `backend/controllers/player.controller.js`.
Find the `registerPlayer` function.
After fetching the auctioneer from the database, add the same limit check that `createPlayer` uses:

```javascript
// Fetch the auctioneer to get limits
const auctioneer = await User.findById(player.auctioneer);
if (auctioneer?.limits?.maxPlayers) {
  const currentCount = await Player.countDocuments({ auctioneer: auctioneer._id });
  if (currentCount >= auctioneer.limits.maxPlayers) {
    return res.status(403).json({
      message: `Registration is full. Maximum ${auctioneer.limits.maxPlayers} players allowed.`
    });
  }
}
```

Add this check before any file upload processing so we don't waste Cloudinary resources on rejected registrations.

---

## FIX B5 — Cloudinary Deletion Uses Wrong Property Names

**Root Cause (from audit):**
- `backend/controllers/admin.controller.js` lines 346, 365: Uses `player.photo` and `team.logo`.
- Schema fields are `player.photoUrl` and `team.logoUrl`.
- Cloudinary assets are never actually deleted on data reset — storage leaks indefinitely.

**What to fix:**

Open `backend/controllers/admin.controller.js`.
Find `resetAuctioneerData` function.
Find line 346: change `player.photo` → `player.photoUrl`
Find line 365: change `team.logo` → `team.logoUrl`

Also extract the Cloudinary public ID correctly. The `photoUrl` is a full Cloudinary URL like:
`https://res.cloudinary.com/your-cloud/image/upload/v123456/players/abc123.webp`

The public ID to delete is: `players/abc123` (the path after `/upload/v.../`).

Add a helper function:
```javascript
function extractCloudinaryPublicId(url) {
  if (!url || !url.includes('cloudinary.com')) return null;
  const parts = url.split('/upload/');
  if (parts.length < 2) return null;
  const withVersion = parts[1];
  // Remove version prefix (v1234567/) if present
  const withoutVersion = withVersion.replace(/^v\d+\//, '');
  // Remove file extension
  return withoutVersion.replace(/\.[^/.]+$/, '');
}
```

Use this helper when building the array of public IDs to delete.

---

## FIX B10 — Duplicate Route Handler for Team PATCH

**Root Cause (from audit):**
- `backend/routes/team.routes.js` lines 43 and 46: `PATCH /:teamId` is registered twice.
- The second handler is unreachable dead code.

**What to fix:**

Open `backend/routes/team.routes.js`.
Find both `PATCH /:teamId` route registrations.
Keep only ONE — the one with multer middleware (since team logos need file upload support).
Delete the duplicate line completely.
Add a comment explaining that this single route handles both logo uploads and non-logo updates.

---

## FIX B11 — `deleteAuctioneer` Leaves Orphaned Documents

**Root Cause (from audit):**
- `backend/controllers/admin.controller.js` lines 247–260: When an auctioneer is deleted, only Players and Teams are removed.
- `FormConfig` and `AppConfig` documents for that auctioneer are never deleted — they stay forever.

**What to fix:**

Open `backend/controllers/admin.controller.js`.
Find the `deleteAuctioneer` function.
After the existing delete operations, add:
```javascript
await FormConfig.deleteMany({ auctioneer: auctioneerId });
await AppConfig.deleteOne({ auctioneer: auctioneerId });
```
Make sure `FormConfig` and `AppConfig` models are imported at the top of the file if not already.

---

## FIX B14 — `resetAuctioneerData` Sets Non-Existent Field

**Root Cause (from audit):**
- `backend/controllers/admin.controller.js` line 389: Sets `registrationTokenExpiry` which does not exist in the User schema.
- Only `registrationToken` exists.

**What to fix:**

Open `backend/controllers/admin.controller.js` line 389.
Find the line setting `registrationTokenExpiry`.
Remove it entirely. It sets a field that doesn't exist and has no effect — it's dead code causing confusion.

---

## FIX B13 — Port Mismatch Between Frontend and Backend Config

**Root Cause (from audit):**
- `frontend/src/services/api.ts` defaults to `http://localhost:5000/api`
- `frontend/package.json` proxy is `http://localhost:5001`
- `.env.example` sets `PORT=5001`
- `RegistrationLinkGenerator` defaults to port `5001`

**What to fix:**

Pick ONE port. Use `5001` (since `.env.example` and `package.json` proxy both say 5001).

Open `frontend/src/services/api.ts`.
Change the default base URL from `http://localhost:5000/api` to `http://localhost:5001/api`.

Open every file that hardcodes a port number and make them all use `5001` or, better, reference `process.env.REACT_APP_API_URL` so it's configurable without code changes.

Create/update `frontend/.env.example`:
```
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_SOCKET_URL=http://localhost:5001
```

Make `api.ts` read:
```javascript
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
```

---

## FIX B12 — Usage Counters Never Updated

**Root Cause (from audit):**
- `usage.totalPlayers`, `usage.totalTeams`, `usage.totalAuctions` are written as 0 at creation and never updated.
- `getMe` calculates them live but never saves the result.
- The stored values are always wrong.

**What to fix:**

Since `getMe` already calculates correct live counts, use the same aggregation approach everywhere.
Do NOT try to maintain incrementing counters — they will always drift under concurrent operations.

Open the User model (`backend/models/user.model.js`).
Remove the `usage.totalPlayers`, `usage.totalTeams`, `usage.totalAuctions` fields from the schema entirely (or mark them as deprecated with a comment). They will no longer be stored.

In `getMe` and any admin endpoint that returns user data:
Always compute usage live using `countDocuments`:
```javascript
const [totalPlayers, totalTeams] = await Promise.all([
  Player.countDocuments({ auctioneer: user._id }),
  Team.countDocuments({ auctioneer: user._id })
]);
```
Return these computed values in the response. Never read from the stale stored fields.

---

## VERIFICATION AFTER ALL B-FIXES

After all fixes above are applied, manually verify:

1. **B2 verified:** Log in → open browser Network/WS tab → confirm `joinAuctioneer` event fires with a valid userId → confirm backend logs the room join.
2. **B3 verified:** Try to sell a player to a team → confirm the request succeeds without "playerId undefined" error.
3. **B1 verified:** POST `{"email":"x@x.com","password":"123456","name":"test","role":"admin"}` to `/api/auth/register` → confirm the created user has `role: "auctioneer"`, not `admin`.
4. **B4 verified:** Send a request from an unlisted origin → confirm you get a CORS error, not a successful response.
5. **B7 verified:** Navigate away from the auction page and back → confirm socket is still connected and events still arrive.

---

**When Phase 1 is complete, confirm:**
- List every file changed
- List every line changed
- All 5 verification checks pass
- No new errors introduced

Then wait for Phase 2 instructions.
