const Player = require('../models/player.model');

/**
 * Computes live, accurate team stats from the database.
 * Always call this instead of trusting stored counter fields.
 */
async function getTeamSummary(team) {
  const soldPlayers = await Player.find(
    { team: team._id, status: 'sold' },
    'name soldAmount photoUrl regNo class position'
  ).lean();

  const totalSpent = soldPlayers.reduce((sum, p) => sum + (p.soldAmount || 0), 0);
  const remainingBudget = team.budget ? (team.budget - totalSpent) : null;
  const filledSlots = soldPlayers.length;

  return {
    _id: team._id,
    name: team.name,
    logoUrl: team.logoUrl,
    budget: team.budget,
    remainingBudget,
    totalSpent,
    totalSlots: team.totalSlots,
    filledSlots,
    remainingSlots: team.totalSlots - filledSlots,
    players: soldPlayers,
    auctioneer: team.auctioneer,
    createdAt: team.createdAt,
    isFull: filledSlots >= team.totalSlots,
    budgetExhausted: remainingBudget !== null && remainingBudget <= 0,
  };
}

module.exports = { getTeamSummary };
