const Player = require('../models/player.model');
const Team = require('../models/team.model');
const User = require('../models/user.model');
const cloudinary = require('../config/cloudinary');
const mongoose = require('mongoose');

// Generate next regNo using MongoDB aggregation (O(1) instead of O(N))
async function generateRegNo(auctioneerId) {
  const result = await Player.aggregate([
    { $match: { auctioneer: auctioneerId, regNo: { $regex: /^P\d+$/ } } },
    {
      $project: {
        numericPart: {
          $toInt: { $substr: ['$regNo', 1, -1] }
        }
      }
    },
    { $group: { _id: null, maxNum: { $max: '$numericPart' } } }
  ]);

  const maxNum = result[0]?.maxNum || 0;
  return `P${String(maxNum + 1).padStart(4, '0')}`;
}

// Pre-upload a photo to Cloudinary (authenticated)
exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo file provided' });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'auction-players',
          public_id: `player_upload_${Date.now()}`,
          resource_type: 'image',
          transformation: [
            { width: 600, height: 600, crop: 'limit', quality: 'auto:good', fetch_format: 'webp' }
          ]
        },
        (error, result) => error ? reject(error) : resolve(result)
      );
      stream.end(req.file.buffer);
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Photo upload error:', error.message);
    res.status(500).json({ error: 'Photo upload failed' });
  }
};

// Pre-upload a photo to Cloudinary (public — no auth)
exports.uploadPhotoPublic = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo file provided' });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'auction-players',
          public_id: `player_upload_${Date.now()}`,
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good', fetch_format: 'webp' }
          ]
        },
        (error, result) => error ? reject(error) : resolve(result)
      );
      stream.end(req.file.buffer);
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Photo upload error:', error.message);
    res.status(500).json({ error: 'Photo upload failed' });
  }
};

// Register a new player with photo (via registration link)
exports.registerPlayer = async (req, res) => {
  try {
    const { name, regNo, token, ...customFieldsData } = req.body;

    // Validate required fields
    if (!name || !token) {
      return res.status(400).json({ 
        error: 'Name and token are required' 
      });
    }

    // Find auctioneer by registration token
    const auctioneer = await User.findOne({ registrationToken: token });
    if (!auctioneer) {
      return res.status(400).json({ 
        error: 'Invalid registration link. Please contact the organizer.' 
      });
    }

    // Check if auctioneer has reached their player limit
    if (auctioneer.limits && auctioneer.limits.maxPlayers != null) {
      const currentPlayerCount = await Player.countDocuments({ auctioneer: auctioneer._id });
      if (currentPlayerCount >= auctioneer.limits.maxPlayers) {
        return res.status(400).json({
          error: 'Registration limit reached. Please contact the organizer.'
        });
      }
    }

    // Separate core fields from custom fields (do this first while upload happens)
    const { class: playerClass, position } = customFieldsData;
    
    // Build custom fields map (exclude core fields and photoUrl)
    const customFields = new Map();
    Object.keys(customFieldsData).forEach(key => {
      if (!['class', 'position', 'photo', 'photoUrl'].includes(key)) {
        customFields.set(key, customFieldsData[key]);
      }
    });

    // Use provided regNo or auto-generate (no uniqueness check — regNo is display metadata)
    const finalRegNo = regNo || await generateRegNo(auctioneer._id);

    // Use pre-uploaded photoUrl if provided, otherwise handle file upload
    const { photoUrl: preUploadedUrl } = customFieldsData;
    let finalPhotoUrl = preUploadedUrl || '';
    let pendingUpload = false;

    if (!finalPhotoUrl && req.file) {
      // File was sent directly — use placeholder, upload in background
      finalPhotoUrl = 'https://placehold.co/400x400/e2e8f0/64748b?text=Photo+Uploading';
      pendingUpload = true;
    }

    // Create new player linked to auctioneer
    const player = new Player({
      name,
      regNo: finalRegNo,
      class: playerClass || 'N/A',
      position: position || 'N/A',
      photoUrl: finalPhotoUrl,
      customFields,
      status: 'available',
      auctioneer: auctioneer._id
    });

    await player.save();

    // Emit socket event for real-time updates (only to this auctioneer's room)
    if (req.app.get('io')) {
      req.app.get('io').to(`auctioneer_${auctioneer._id}`).emit('playerAdded', player);
    }

    // Return success immediately — don't make user wait for Cloudinary
    res.status(201).json({
      message: 'Player registered successfully',
      player,
      auctioneerName: auctioneer.name
    });

    // Upload image in background AFTER response is sent (only if not pre-uploaded)
    if (pendingUpload && req.file) {
      const { uploadToCloudinary } = require('../utils/cloudinaryUpload');
      (async () => {
        try {
          const result = await uploadToCloudinary(req.file.buffer, {
            folder: 'auction-players',
            public_id: `player_${finalRegNo}_${Date.now()}`,
            resource_type: 'image',
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
              { quality: 'auto:good', fetch_format: 'webp' }
            ]
          });
          player.photoUrl = result.secure_url;
          await player.save();

          // Notify connected clients of the updated photo
          if (req.app.get('io')) {
            req.app.get('io').to(`auctioneer_${auctioneer._id}`).emit('playerUpdated', player.toObject());
          }
        } catch (uploadErr) {
          console.error('Background upload failed for player', player._id, uploadErr.message);
        }
      })().catch(err => console.error('Unhandled upload error:', err.message));
    }

  } catch (error) {
    console.error('Error registering player:', error);
    res.status(500).json({ error: 'Error registering player: ' + error.message });
  }
};

// Get random unsold player - OPTIMIZED with aggregation
exports.getRandomPlayer = async (req, res) => {
  try {
    // OPTIMIZED: Use aggregation $sample for better random selection
    const players = await Player.aggregate([
      { 
        $match: { 
          status: 'available',
          auctioneer: req.user._id 
        } 
      },
      { $sample: { size: 1 } }
    ]);
    
    if (players.length === 0) {
      return res.status(404).json({ message: 'No available players found' });
    }

    const player = players[0];
    res.json(player);
  } catch (error) {
    console.error('Error fetching random player:', error);
    res.status(500).json({ error: 'Error fetching random player' });
  }
};

// Assign player to team - ATOMIC with MongoDB transaction
exports.assignPlayer = async (req, res) => {
  const playerId = req.params.playerId;
  const { teamId, amount } = req.body;

  if (!playerId) return res.status(400).json({ error: 'Player ID is required' });
  if (!teamId) return res.status(400).json({ error: 'Team ID is required' });
  if (!amount || amount < 0) return res.status(400).json({ error: 'Valid bid amount is required' });

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      // Fetch both documents within the transaction
      const player = await Player.findOne({ _id: playerId, auctioneer: req.user._id }).session(session);
      const team = await Team.findOne({ _id: teamId, auctioneer: req.user._id }).session(session);

      if (!player) throw new Error('Player not found');
      if (!team) throw new Error('Team not found');
      if (player.status !== 'available') throw new Error('Player is not available for sale');

      // Compute live slot count (array length is the truth)
      const filledSlots = team.players.length;
      if (filledSlots >= team.totalSlots) {
        throw new Error(`Team "${team.name}" has no remaining slots (${filledSlots}/${team.totalSlots})`);
      }

      // Compute live remaining budget from actual sold amounts
      if (team.budget) {
        const budgetUsed = await Player.aggregate([
          { $match: { team: team._id, status: 'sold' } },
          { $group: { _id: null, total: { $sum: '$soldAmount' } } }
        ]).session(session);
        const totalSpent = budgetUsed[0]?.total || 0;
        const remainingBudget = (team.budget || 0) - totalSpent;

        if (amount > remainingBudget) {
          throw new Error(`Insufficient budget. Team "${team.name}" has ₹${remainingBudget} remaining, bid is ₹${amount}`);
        }
      }

      // Apply changes
      player.status = 'sold';
      player.team = team._id;
      player.soldAmount = amount;

      team.players.push(player._id);
      team.filledSlots = team.players.length;

      // Recompute stored remainingBudget for read convenience
      if (team.budget) {
        const budgetUsedAfter = await Player.aggregate([
          { $match: { team: team._id, status: 'sold', _id: { $ne: player._id } } },
          { $group: { _id: null, total: { $sum: '$soldAmount' } } }
        ]).session(session);
        const totalSpentBefore = budgetUsedAfter[0]?.total || 0;
        team.remainingBudget = team.budget - totalSpentBefore - amount;
      }

      await player.save({ session });
      await team.save({ session });

      result = { player, team };
    });

    // Broadcast via Socket.io
    const io = req.app.get('io');
    if (io) {
      const room = `auctioneer_${req.user._id}`;
      io.to(room).emit('playerSold', result.player);
      io.to(room).emit('teamUpdated', result.team);
    }

    res.json({ message: 'Player assigned successfully', player: result.player, team: result.team });
  } catch (err) {
    const userMessage = err.message.includes('no remaining slots') ||
                        err.message.includes('Insufficient budget') ||
                        err.message.includes('not available') ||
                        err.message.includes('not found')
      ? err.message
      : 'Failed to assign player. Please try again.';
    return res.status(400).json({ error: userMessage });
  } finally {
    session.endSession();
  }
};

// Mark player as unsold
exports.markUnsold = async (req, res) => {
  try {
    const { playerId } = req.params;
    
    // Verify player belongs to this auctioneer
    const player = await Player.findOne({ _id: playerId, auctioneer: req.user._id });
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found or access denied' });
    }

    player.status = 'unsold';
    await player.save();

    // Emit socket event for real-time updates (only to this auctioneer)
    const io = req.app.get('io');
    if (io) {
      io.to(`auctioneer_${req.user._id}`).emit('playerMarkedUnsold', player);
      io.to(`auctioneer_${req.user._id}`).emit('playerUpdated', player);
    }

    res.json({ message: 'Player marked as unsold', player });
  } catch (error) {
    res.status(500).json({ error: 'Error marking player as unsold' });
  }
};

// Get all unsold players - OPTIMIZED
exports.getUnsoldPlayers = async (req, res) => {
  try {
    // Filter by logged-in auctioneer
    // OPTIMIZED: Use lean() for plain JS objects, sort by name
    const players = await Player.find({ 
      status: 'unsold',
      auctioneer: req.user._id 
    })
    .sort({ name: 1 })
    .lean();
    
    res.set('Cache-Control', 'private, max-age=5');
    res.json(players);
  } catch (error) {
    console.error('Error fetching unsold players:', error);
    res.status(500).json({ error: 'Error fetching unsold players' });
  }
};

// Get all players - with optional pagination
exports.getAllPlayers = async (req, res) => {
  try {
    const { page, limit = 50, status, search } = req.query;
    const query = { auctioneer: req.user._id };
    if (status) query.status = status;
    if (search) query.name = { $regex: search, $options: 'i' };

    // If page param is provided, return paginated response
    if (page) {
      const pageNum = parseInt(page);
      const limitNum = Math.min(parseInt(limit), 100);
      const skip = (pageNum - 1) * limitNum;

      const [players, total] = await Promise.all([
        Player.find(query)
          .populate('team', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Player.countDocuments(query)
      ]);

      return res.json({
        players,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
          hasMore: skip + players.length < total
        }
      });
    }

    // Default: return all players (backward compatible)
    const players = await Player.find(query)
      .populate('team', 'name')
      .sort({ createdAt: -1 })
      .lean();
    
    res.set('Cache-Control', 'private, max-age=5');
    res.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Error fetching players' });
  }
};

// Delete all players (for auction reset) - OPTIMIZED
exports.deleteAllPlayers = async (req, res) => {
  try {
    // Only delete players belonging to the logged-in auctioneer
    const result = await Player.deleteMany({ auctioneer: req.user._id });
    
    // Emit socket event for real-time updates (only to this auctioneer)
    const io = req.app.get('io');
    if (io) {
      io.to(`auctioneer_${req.user._id}`).emit('dataReset');
      io.to(`auctioneer_${req.user._id}`).emit('playersCleared');
    }
    
    res.json({ 
      message: 'All players deleted successfully', 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error deleting all players:', error);
    res.status(500).json({ error: 'Error deleting all players' });
  }
};

// Remove player from team - ATOMIC with MongoDB transaction
exports.removePlayerFromTeam = async (req, res) => {
  const { playerId } = req.params;
  const session = await mongoose.startSession();

  try {
    let resultPlayer, resultTeam;

    await session.withTransaction(async () => {
      // Verify player belongs to this auctioneer
      const player = await Player.findOne({ _id: playerId, auctioneer: req.user._id }).session(session);
      if (!player) throw new Error('Player not found or access denied');

      // Find the team — either from player.team or by searching teams
      let team = null;
      if (player.team) {
        team = await Team.findOne({ _id: player.team, auctioneer: req.user._id }).session(session);
      }
      if (!team) {
        team = await Team.findOne({ auctioneer: req.user._id, players: playerId }).session(session);
      }
      if (!team) throw new Error('Player is not assigned to any team');

      // Remove player from team
      team.players = team.players.filter(p => String(p) !== String(playerId));
      team.filledSlots = team.players.length;

      // Recompute remaining budget live
      if (team.budget) {
        const budgetUsed = await Player.aggregate([
          { $match: { team: team._id, status: 'sold', _id: { $ne: player._id } } },
          { $group: { _id: null, total: { $sum: '$soldAmount' } } }
        ]).session(session);
        team.remainingBudget = team.budget - (budgetUsed[0]?.total || 0);
      }

      // Reset player
      player.status = 'available';
      player.team = null;
      player.soldAmount = 0;

      await player.save({ session });
      await team.save({ session });

      resultPlayer = player;
      resultTeam = team;
    });

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      const room = `auctioneer_${req.user._id}`;
      io.to(room).emit('playerUpdated', resultPlayer);
      io.to(room).emit('teamUpdated', resultTeam);
      io.to(room).emit('playerRemovedFromTeam', { player: resultPlayer, team: resultTeam });
    }

    res.json({ message: 'Player removed from team successfully', player: resultPlayer, team: resultTeam });
  } catch (err) {
    const status = err.message.includes('not found') || err.message.includes('not assigned') ? 404 : 500;
    return res.status(status).json({ error: err.message || 'Error removing player from team' });
  } finally {
    session.endSession();
  }
};

// Update player (PATCH)
exports.updatePlayer = async (req, res) => {
  try {
    const { playerId } = req.params;
    const updateData = req.body;

    // Verify player belongs to this auctioneer
    const player = await Player.findOne({ _id: playerId, auctioneer: req.user._id });
    if (!player) {
      return res.status(404).json({ error: 'Player not found or access denied' });
    }

    const oldTeam = player.team;
    const oldStatus = player.status;
    const oldSoldAmount = player.soldAmount || 0;
    const newTeam = updateData.team;
    const newStatus = updateData.status;

    // Handle photo upload if provided
    if (req.file) {
      try {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'auction-players',
              public_id: `player_${player.regNo || playerId}_${Date.now()}`,
              resource_type: 'image',
              transformation: [
                { width: 600, height: 600, crop: 'limit', quality: 'auto:good', fetch_format: 'webp' }
              ],
              eager_async: true,
              invalidate: false
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(req.file.buffer);
        });
        
        player.photoUrl = result.secure_url;
        console.log('Photo updated:', result.secure_url);
      } catch (uploadError) {
        console.error('Error uploading photo:', uploadError);
        return res.status(400).json({ 
          error: 'Failed to upload photo. Please try again.' 
        });
      }
    }

    // Update player fields
    Object.keys(updateData).forEach(key => {
      if (key !== 'photo') { // Skip photo as it's handled separately
        player[key] = updateData[key];
      }
    });

    // If marking as unsold, clear team and soldAmount
    if (updateData.status === 'unsold') {
      player.team = null;
      player.soldAmount = null;
      
      // If player was previously sold, refund the team
      if (oldTeam && oldStatus === 'sold') {
        const team = await Team.findOne({ _id: oldTeam, auctioneer: req.user._id });
        if (team) {
          team.players = team.players.filter(p => String(p) !== String(playerId));
          team.filledSlots = team.players.length;
          // Recompute budget from aggregation (source of truth)
          if (team.budget) {
            const budgetUsed = await Player.aggregate([
              { $match: { team: team._id, status: 'sold', _id: { $ne: player._id } } },
              { $group: { _id: null, total: { $sum: '$soldAmount' } } }
            ]);
            team.remainingBudget = team.budget - (budgetUsed[0]?.total || 0);
          }
          await team.save();
          
          const io = req.app.get('io');
          if (io) {
            io.to(`auctioneer_${req.user._id}`).emit('teamUpdated', team);
          }
        }
      }
    }
    
    // If changing teams or assigning to a team for the first time
    if (updateData.status === 'sold' && updateData.team) {
      const teamChanged = oldTeam && String(oldTeam) !== String(newTeam);
      
      // Remove from old team if changing teams
      if (teamChanged && oldTeam) {
        const oldTeamDoc = await Team.findOne({ _id: oldTeam, auctioneer: req.user._id });
        if (oldTeamDoc) {
          oldTeamDoc.players = oldTeamDoc.players.filter(p => String(p) !== String(playerId));
          oldTeamDoc.filledSlots = oldTeamDoc.players.length;
          // Recompute budget from aggregation (source of truth)
          if (oldTeamDoc.budget) {
            const budgetUsed = await Player.aggregate([
              { $match: { team: oldTeamDoc._id, status: 'sold', _id: { $ne: player._id } } },
              { $group: { _id: null, total: { $sum: '$soldAmount' } } }
            ]);
            oldTeamDoc.remainingBudget = oldTeamDoc.budget - (budgetUsed[0]?.total || 0);
          }
          await oldTeamDoc.save();
          
          const io = req.app.get('io');
          if (io) {
            io.to(`auctioneer_${req.user._id}`).emit('teamUpdated', oldTeamDoc);
          }
        }
      }
      
      // Add to new team
      const team = await Team.findOne({ _id: updateData.team, auctioneer: req.user._id });
      if (!team) {
        return res.status(404).json({ error: 'Team not found or access denied' });
      }
      
      // Check if player is already in team's players array
      const playerExists = team.players.some(p => String(p) === String(playerId));
      if (!playerExists) {
        team.players.push(playerId);
        team.filledSlots = team.players.length;
      }
      
      // Recompute budget from aggregation (source of truth) instead of arithmetic on stored value
      if (team.budget) {
        const budgetUsed = await Player.aggregate([
          { $match: { team: team._id, status: 'sold' } },
          { $group: { _id: null, total: { $sum: '$soldAmount' } } }
        ]);
        team.remainingBudget = team.budget - (budgetUsed[0]?.total || 0);
      }
      
      await team.save();
      
      const io = req.app.get('io');
      if (io) {
        io.to(`auctioneer_${req.user._id}`).emit('teamUpdated', team);
      }
    }

    await player.save();
    
    // Emit socket event for real-time updates (only to this auctioneer)
    const io = req.app.get('io');
    if (io) {
      io.to(`auctioneer_${req.user._id}`).emit('playerUpdated', player);
      if (updateData.status === 'unsold') {
        io.to(`auctioneer_${req.user._id}`).emit('playerMarkedUnsold', player);
      }
      if (updateData.status === 'sold') {
        io.to(`auctioneer_${req.user._id}`).emit('playerSold', player);
      }
    }
    
    res.json(player);
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ error: 'Error updating player' });
  }
};

// Delete single player
exports.deletePlayer = async (req, res) => {
  try {
    const { playerId } = req.params;

    // Verify player belongs to this auctioneer
    const player = await Player.findOne({ _id: playerId, auctioneer: req.user._id });
    if (!player) {
      return res.status(404).json({ error: 'Player not found or access denied' });
    }

    // If player is assigned to a team, remove them from the team
    if (player.team && player.status === 'sold') {
      const teamId = player.team;
      const soldAmount = player.soldAmount || 0;

      const team = await Team.findOne({ _id: teamId, auctioneer: req.user._id });
      if (team) {
        // Remove player from team's players array
        team.players = team.players.filter(p => String(p) !== String(playerId));
        team.filledSlots = team.players.length;
        
        // Recompute budget from aggregation (source of truth)
        if (team.budget) {
          const budgetUsed = await Player.aggregate([
            { $match: { team: team._id, status: 'sold', _id: { $ne: player._id } } },
            { $group: { _id: null, total: { $sum: '$soldAmount' } } }
          ]);
          team.remainingBudget = team.budget - (budgetUsed[0]?.total || 0);
        }
        
        await team.save();
        
        // Emit socket event for team update
        const io = req.app.get('io');
        if (io) {
          io.to(`auctioneer_${req.user._id}`).emit('teamUpdated', team);
        }
      }
    }

    // Delete the player
    await Player.deleteOne({ _id: playerId });

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`auctioneer_${req.user._id}`).emit('playerDeleted', { playerId });
    }

    res.json({ message: 'Player deleted successfully' });
  } catch (error) {
    console.error('Error deleting player:', error);
    res.status(500).json({ error: 'Error deleting player' });
  }
};

// Create player from admin panel
exports.createPlayer = async (req, res) => {
  try {
    // Check if auctioneer has reached player limit
    if (req.user.role === 'auctioneer' && req.user.limits && req.user.limits.maxPlayers !== null) {
      const currentPlayerCount = await Player.countDocuments({ auctioneer: req.user._id });
      if (currentPlayerCount >= req.user.limits.maxPlayers) {
        return res.status(403).json({
          error: `Player limit reached. Maximum allowed: ${req.user.limits.maxPlayers}. Contact admin for upgrade.`
        });
      }
    }

    const { name, regNo, class: playerClass, position, ...otherFields } = req.body;

    console.log('Creating player:', { name, regNo, playerClass, position, otherFields, hasFile: !!req.file });

    // Validate required field - only name is truly required
    if (!name) {
      return res.status(400).json({ 
        error: 'Player name is required' 
      });
    }

    // Build custom fields from any extra fields sent (exclude photoUrl — it's used below)
    const customFields = new Map();
    Object.keys(otherFields).forEach(key => {
      if (otherFields[key] && key !== 'photoUrl') {
        customFields.set(key, otherFields[key]);
      }
    });

    // Use provided regNo or auto-generate (no uniqueness check — regNo is display metadata)
    const finalRegNo = regNo || await generateRegNo(req.user._id);

    // Use pre-uploaded photoUrl if available, otherwise handle file
    const preUploadedUrl = otherFields.photoUrl;
    let photoUrl = preUploadedUrl || '';
    let pendingUpload = false;

    if (!photoUrl && req.file) {
      photoUrl = 'https://via.placeholder.com/400x400?text=' + encodeURIComponent(name.charAt(0));
      pendingUpload = true;
    } else if (!photoUrl) {
      photoUrl = '';
    }

    const player = new Player({
      name,
      regNo: finalRegNo,
      class: playerClass || 'N/A',
      position: position || 'N/A',
      photoUrl,
      customFields,
      auctioneer: req.user._id,
      status: 'available'
    });

    // Save player immediately
    await player.save();
    
    // Get IO instance for socket events
    const io = req.app.get('io');
    
    // Emit socket event for real-time updates (immediate)
    if (io) {
      const roomName = `auctioneer_${req.user._id}`;
      console.log(`📡 Emitting playerAdded to room: ${roomName}`, { name: player.name, regNo: player.regNo });
      io.to(roomName).emit('playerAdded', player);
      
      // Also log all clients in this room
      const room = io.sockets.adapter.rooms.get(roomName);
      console.log(`📡 Room ${roomName} has ${room ? room.size : 0} connected clients`);
    } else {
      console.error('❌ Socket.io instance not available!');
    }

    // Send immediate response
    res.status(201).json(player);

    // Upload photo to Cloudinary in background only if not pre-uploaded
    if (pendingUpload && req.file) {
      const auctioneerId = req.user._id;
      const playerId = player._id;
      const playerName = name;
      
      // Wrap in async IIFE to catch unhandled rejections
      (async () => {
        try {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'auction-players',
              public_id: `player_${finalRegNo}_${Date.now()}`,
              resource_type: 'image',
              transformation: [
                { width: 600, height: 600, crop: 'limit', quality: 'auto:good', fetch_format: 'webp' }
              ],
              eager_async: true,
              invalidate: false,
              timeout: 60000
            },
            async (error, result) => {
              if (error) {
                console.error(`❌ Upload failed for ${playerName}:`, error.message || error);
                return;
              }
              
              try {
                const updatedPlayer = await Player.findById(playerId);
                if (updatedPlayer) {
                  updatedPlayer.photoUrl = result.secure_url;
                  await updatedPlayer.save();
                  
                  if (io) {
                    io.to(`auctioneer_${auctioneerId}`).emit('playerUpdated', updatedPlayer);
                  }
                  console.log(`✓ Photo uploaded for ${playerName}`);
                }
              } catch (err) {
                console.error(`❌ Error updating photo for ${playerName}:`, err.message);
              }
            }
          );
          uploadStream.end(req.file.buffer);
        } catch (err) {
          console.error(`❌ Background upload error:`, err.message);
        }
      })().catch(err => console.error(`❌ Unhandled upload error:`, err.message));
    }
  } catch (error) {
    console.error('Error creating player:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'A duplicate record was detected. Please try again.' 
      });
    }
    
    res.status(500).json({ error: error.message || 'Error creating player' });
  }
};