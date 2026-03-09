const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  regNo: {
    type: String,
    required: false,
    unique: false,
    trim: true
  },
  class: {
    type: String,
    required: true,
    trim: true
  },
  position: {
    type: String,
    required: true,
    trim: true
  },
  photoUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'unsold'],
    default: 'available'
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  soldAmount: {
    type: Number,
    default: 0
  },
  auctioneer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Optional for backward compatibility
    index: true
  },
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for faster queries
playerSchema.index({ status: 1 });
playerSchema.index({ team: 1 });
// regNo index removed — regNo is optional display metadata, not a lookup key
playerSchema.index({ status: 1, team: 1 }); // Compound index for filtered queries
playerSchema.index({ auctioneer: 1, status: 1 }); // Compound for auctioneer + status queries
playerSchema.index({ auctioneer: 1, createdAt: -1 }); // For sorted queries

module.exports = mongoose.model('Player', playerSchema);