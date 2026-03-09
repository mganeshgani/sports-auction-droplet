const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// JWT Secret - MUST be set via environment variable
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Exiting.');
  process.exit(1);
}
const JWT_EXPIRE = '7d'; // Token expires in 7 days

// Generate JWT Token
exports.generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
};

// Verify JWT Token Middleware
exports.protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header or cookies
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route. Please login.'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from token - OPTIMIZED: Only select needed fields
    req.user = await User.findById(decoded.id)
      .select('_id name email role isActive accessExpiry limits usage registrationToken')
      .lean();

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Your account has been deactivated by admin'
      });
    }

    // Check if access has expired (only for auctioneers)
    if (req.user.role === 'auctioneer' && req.user.accessExpiry) {
      if (new Date() > new Date(req.user.accessExpiry)) {
        return res.status(401).json({
          success: false,
          error: 'Your access has expired. Please contact admin.'
        });
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token. Please login again.'
    });
  }
};

// Middleware to check if user is admin
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.'
    });
  }
  next();
};
