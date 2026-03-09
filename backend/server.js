require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const compression = require('compression');

// Enable mongoose query caching and lean by default for reads
mongoose.set('strictQuery', true);

const app = express();

// Trust proxy for rate limiting behind reverse proxies
app.set('trust proxy', 1);
const server = http.createServer(app);

// CORS Configuration - Allow production frontend
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL, // Production frontend URL from environment
  'https://neoauction.vercel.app',
  'https://sports-auction.vercel.app',
  'https://sports-auction-oc52.vercel.app',
  'https://sports-auction-*.vercel.app',
  'https://neoauction-*.vercel.app' // Allow Vercel preview deployments
].filter(Boolean); // Remove undefined values

// Shared CORS origin checker used by both Socket.io and Express
function isOriginAllowed(origin) {
  if (!origin) return true;
  return allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    return allowedOrigin === origin;
  });
}

// Socket.io configuration with extended timeouts for long auction sessions (1+ hour idle support)
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  },
  // Extended timeouts for 1+ hour idle auction sessions
  pingTimeout: 300000, // 5 minutes - wait this long before considering connection dead
  pingInterval: 20000, // 20 seconds - send ping every 20s to keep connection alive
  connectTimeout: 30000, // 30 seconds connection timeout
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  perMessageDeflate: true, // Compress messages for better performance
  maxHttpBufferSize: 1e6 // 1MB max message size
});

// Socket.io connection handling with auctioneer rooms
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Track last activity for this socket
  let lastActivity = Date.now();

  // Handle heartbeat from client to keep connection alive
  socket.on('heartbeat', (data) => {
    lastActivity = Date.now();
    // Respond with server timestamp for latency tracking
    socket.emit('heartbeat_ack', { 
      serverTime: Date.now(), 
      clientTime: data.timestamp,
      latency: Date.now() - data.timestamp 
    });
  });

  // Handle ping from client
  socket.on('ping', () => {
    lastActivity = Date.now();
    socket.emit('pong');
  });

  // Join auctioneer-specific room when authenticated
  socket.on('joinAuctioneer', (auctioneerId) => {
    console.log(`📥 Received joinAuctioneer request from socket ${socket.id} with auctioneerId:`, auctioneerId);
    const roomName = `auctioneer_${auctioneerId}`;
    socket.join(roomName);
    console.log(`✅ Socket ${socket.id} successfully joined room: ${roomName}`);
    lastActivity = Date.now();
    
    // Verify the join worked
    const room = io.sockets.adapter.rooms.get(roomName);
    console.log(`📊 Room ${roomName} now has ${room ? room.size : 0} client(s)`);
    
    // Send confirmation to client
    socket.emit('roomJoined', { room: roomName, socketId: socket.id });
  });

  // Leave auctioneer room
  socket.on('leaveAuctioneer', (auctioneerId) => {
    const roomName = `auctioneer_${auctioneerId}`;
    socket.leave(roomName);
    console.log(`Socket ${socket.id} left room: ${roomName}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });

  // Bid events are now scoped to auctioneer rooms (sent from client with auctioneerId)
  socket.on('placeBid', (data) => {
    console.log('Bid placed:', data);
    if (data.auctioneerId) {
      io.to(`auctioneer_${data.auctioneerId}`).emit('bidPlaced', data);
    }
  });

  // Auction start events are scoped to auctioneer rooms
  socket.on('startAuction', (data) => {
    console.log('Auction started:', data);
    if (data.auctioneerId) {
      io.to(`auctioneer_${data.auctioneerId}`).emit('auctionStarted', data);
    }
  });
});

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error(`CORS: Origin ${origin} not allowed`), false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
}));

// Simple in-memory rate limiter (no external dependencies)
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 requests per minute

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  // Clean old entries
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore) {
      if (now - value.startTime > RATE_LIMIT_WINDOW) {
        rateLimitStore.delete(key);
      }
    }
  }
  
  const record = rateLimitStore.get(ip);
  
  if (!record) {
    rateLimitStore.set(ip, { count: 1, startTime: now });
    return next();
  }
  
  if (now - record.startTime > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(ip, { count: 1, startTime: now });
    return next();
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({ 
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((record.startTime + RATE_LIMIT_WINDOW - now) / 1000)
    });
  }
  
  record.count++;
  next();
};

// Apply rate limiting to API routes only
app.use('/api', rateLimiter);

// Gzip compression for responses (faster loading)
app.use(compression({
  level: 6,
  threshold: 512, // Compress responses > 512 bytes
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Add response time tracking header
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Log slow requests (> 1 second)
    if (duration > 1000) {
      console.warn(`⚠️ Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  next();
});

// Parse JSON with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser middleware
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// MongoDB Connection with optimized settings for long auction sessions (1+ hour idle support)
// Using MongoDB Atlas — transactions are supported via replica set
// Required for atomic player assignment operations
const path = require('path');
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 20, // Increased for better concurrency
  minPoolSize: 5, // Keep minimum connections ready
  serverSelectionTimeoutMS: 10000, // Extended for reliability
  socketTimeoutMS: 3600000, // 1 hour - extended for long idle sessions
  maxIdleTimeMS: 3600000, // 1 hour - keep connections alive during long auctions
  compressors: ['zlib'], // Enable compression for MongoDB wire protocol
  retryWrites: true,
  retryReads: true,
  heartbeatFrequencyMS: 10000, // Check server health every 10 seconds
})
.then(async () => {
  console.log('✅ Connected to MongoDB Atlas');
  
  // Sync indexes to drop stale unique constraints from old schema versions
  const Player = require('./models/player.model');
  await Player.syncIndexes();
  console.log('✅ Player indexes synced');
})
.catch((err) => console.error('❌ MongoDB connection error:', err));

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Make io accessible to routes
app.set('io', io);

// Import Routes
const playerRoutes = require('./routes/player.routes');
const teamRoutes = require('./routes/team.routes');
const authRoutes = require('./routes/auth.routes');
const formConfigRoutes = require('./routes/formConfig.routes');
const adminRoutes = require('./routes/admin.routes');
const appConfigRoutes = require('./routes/appConfig.routes');

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Sports Auction API is running' });
});

app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/form-config', formConfigRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', appConfigRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.code === 11000) {
    return res.status(400).json({ error: 'Duplicate entry' });
  }
  
  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : err.message 
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Socket.io is ready');
});