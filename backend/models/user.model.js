const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },
  role: {
    type: String,
    enum: ['admin', 'auctioneer'],
    default: 'auctioneer'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  accessExpiry: {
    type: Date,
    default: null // null means unlimited access
  },
  // Limits controlled by admin
  limits: {
    maxPlayers: {
      type: Number,
      default: null // null means unlimited
    },
    maxTeams: {
      type: Number,
      default: null // null means unlimited
    },
    maxAuctions: {
      type: Number,
      default: null // null means unlimited
    }
  },
  // DEPRECATED: These counters are never updated and always stale.
  // Use live counts via Player.countDocuments / Team.countDocuments instead.
  // Kept for backward compatibility but should not be read from.
  usage: {
    totalPlayers: {
      type: Number,
      default: 0
    },
    totalTeams: {
      type: Number,
      default: 0
    },
    totalAuctions: {
      type: Number,
      default: 0
    }
  },
  lastLogin: {
    type: Date
  },
  registrationToken: {
    type: String,
    unique: true,
    sparse: true // Allow null values
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Indexes for faster queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ registrationToken: 1 });

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to exclude password from JSON response
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
