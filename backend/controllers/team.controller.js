const Team = require('../models/team.model');
const Player = require('../models/player.model');
const { saveImage } = require('../utils/localUpload');
const { getTeamSummary } = require('../utils/teamSummary');

// Create new team
exports.createTeam = async (req, res) => {
  try {
    // Check if auctioneer has reached team limit
    if (req.user.role === 'auctioneer' && req.user.limits && req.user.limits.maxTeams !== null) {
      const currentTeamCount = await Team.countDocuments({ auctioneer: req.user._id });
      if (currentTeamCount >= req.user.limits.maxTeams) {
        return res.status(403).json({
          error: `Team limit reached. Maximum allowed: ${req.user.limits.maxTeams}. Contact admin for upgrade.`
        });
      }
    }

    const { name, totalSlots, budget } = req.body;

    // OPTIMIZED: Prepare upload promise but don't await yet
    const uploadPromise = req.file ? saveImage(req.file.buffer, {
      folder: 'team-logos',
      width: 200,
      height: 200,
      fit: 'inside'
    }) : Promise.resolve('');

    // OPTIMIZED: Upload happens in parallel with team creation
    const logoUrl = await uploadPromise;
    
    const team = new Team({
      name,
      logoUrl,
      totalSlots,
      budget,
      remainingBudget: budget,
      auctioneer: req.user._id // Link team to auctioneer
    });

    await team.save();
    
    // Emit socket event only to this auctioneer's room
    const io = req.app.get('io');
    if (io) {
      io.to(`auctioneer_${req.user._id}`).emit('teamCreated', team);
    }
    
    res.status(201).json(team);
  } catch (error) {
    if (error.code === 11000) { // Duplicate key error
      return res.status(400).json({ error: 'Team name already exists in your auction' });
    }
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Error creating team' });
  }
};

// Update team
exports.updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const updateData = req.body;

    // Verify team belongs to this auctioneer
    const team = await Team.findOne({ _id: teamId, auctioneer: req.user._id });
    if (!team) {
      return res.status(404).json({ error: 'Team not found or access denied' });
    }

    // Handle MongoDB $push operation for adding players
    if (updateData.$push && updateData.$push.players) {
      team.players.push(updateData.$push.players);
      team.filledSlots = team.players.length;
      
      // Deduct soldAmount from remainingBudget if provided
      if (updateData.soldAmount && typeof updateData.soldAmount === 'number') {
        // Recompute budget from aggregation (source of truth)
        if (team.budget) {
          const budgetUsed = await Player.aggregate([
            { $match: { team: team._id, status: 'sold' } },
            { $group: { _id: null, total: { $sum: '$soldAmount' } } }
          ]);
          team.remainingBudget = team.budget - (budgetUsed[0]?.total || 0);
        }
      }
      
      await team.save();
      
      // Emit socket event for real-time updates (only to this auctioneer)
      const io = req.app.get('io');
      if (io) {
        io.to(`auctioneer_${req.user._id}`).emit('teamUpdated', team);
      }
      
      return res.json(team);
    }

    // Regular update fields
    const { name, totalSlots, budget } = updateData;

    // Validate total slots before upload
    if (totalSlots && totalSlots < team.filledSlots) {
      return res.status(400).json({ 
        error: 'New total slots cannot be less than current filled slots' 
      });
    }

    // OPTIMIZED: Prepare logo upload promise (non-blocking)
    const uploadPromise = req.file ? saveImage(req.file.buffer, {
      folder: 'team-logos',
      width: 200,
      height: 200,
      fit: 'inside'
    }) : Promise.resolve(null);

    // OPTIMIZED: Update fields and upload in parallel
    const [logoUrl] = await Promise.all([
      uploadPromise,
      Promise.resolve() // Placeholder for field updates below
    ]);

    if (logoUrl) team.logoUrl = logoUrl;
    if (name) team.name = name;
    if (totalSlots) team.totalSlots = totalSlots;
    if (budget !== undefined) {
      // Recompute spent from aggregation (source of truth)
      const budgetUsed = await Player.aggregate([
        { $match: { team: team._id, status: 'sold' } },
        { $group: { _id: null, total: { $sum: '$soldAmount' } } }
      ]);
      const spentBudget = budgetUsed[0]?.total || 0;
      team.budget = budget;
      team.remainingBudget = budget - spentBudget;
    }

    await team.save();
    
    // Emit socket event for real-time updates (only to this auctioneer)
    const io = req.app.get('io');
    if (io) {
      io.to(`auctioneer_${req.user._id}`).emit('teamUpdated', team);
    }
    
    res.json(team);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Team name already exists in your auction' });
    }
    res.status(500).json({ error: 'Error updating team' });
  }
};

// Delete team
exports.deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Verify team belongs to this auctioneer
    const team = await Team.findOne({ _id: teamId, auctioneer: req.user._id });
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found or access denied' });
    }

    // Check if team has players
    if (team.filledSlots > 0) {
      return res.status(400).json({ 
        error: `Cannot delete team with assigned players. Please remove all ${team.filledSlots} player(s) first.`
      });
    }

    await team.deleteOne();
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`auctioneer_${req.user._id}`).emit('teamDeleted', { teamId });
    }
    
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Error deleting team' });
  }
};

// Get all teams - with live-computed stats
exports.getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find({ auctioneer: req.user._id })
      .sort({ name: 1 })
      .lean();

    const teamsWithStats = await Promise.all(teams.map(team => getTeamSummary(team)));
    
    res.set('Cache-Control', 'private, max-age=5');
    res.json(teamsWithStats);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Error fetching teams' });
  }
};

// Get team by ID - with live-computed stats
exports.getTeamById = async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findOne({ _id: teamId, auctioneer: req.user._id }).lean();
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const teamWithStats = await getTeamSummary(team);
    res.set('Cache-Control', 'private, max-age=5');
    res.json(teamWithStats);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Error fetching team' });
  }
};

// Get final results - with live-computed stats
exports.getFinalResults = async (req, res) => {
  try {
    const teams = await Team.find({ auctioneer: req.user._id })
      .sort('name')
      .lean();

    const teamsWithStats = await Promise.all(teams.map(team => getTeamSummary(team)));

    const results = teamsWithStats.map(team => ({
      teamName: team.name,
      logoUrl: team.logoUrl,
      totalPlayers: team.filledSlots,
      totalSlots: team.totalSlots,
      budget: team.budget,
      remainingBudget: team.remainingBudget,
      players: team.players.map(player => ({
        name: player.name,
        regNo: player.regNo,
        class: player.class,
        position: player.position,
        soldAmount: player.soldAmount,
        photoUrl: player.photoUrl
      }))
    }));

    res.set('Cache-Control', 'private, max-age=10');
    res.json(results);
  } catch (error) {
    console.error('Error fetching final results:', error);
    res.status(500).json({ error: 'Error fetching final results' });
  }
};

// Delete all teams (for auction reset) - OPTIMIZED
exports.deleteAllTeams = async (req, res) => {
  try {
    // Only delete teams belonging to the logged-in auctioneer
    const result = await Team.deleteMany({ auctioneer: req.user._id });
    
    // Emit socket event for real-time updates (only to this auctioneer)
    const io = req.app.get('io');
    if (io) {
      io.to(`auctioneer_${req.user._id}`).emit('dataReset');
      io.to(`auctioneer_${req.user._id}`).emit('teamsCleared');
    }
    
    res.json({ 
      message: 'All teams deleted successfully', 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error deleting all teams:', error);
    res.status(500).json({ error: 'Error deleting all teams' });
  }
};