import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001';

// Singleton socket instance
let socketInstance: any = null;

// Keep-alive state
let wakeLock: any = null;
let heartbeatInterval: NodeJS.Timeout | null = null;
let visibilityHandler: (() => void) | null = null;
let keepAliveInterval: NodeJS.Timeout | null = null;
let apiPingInterval: NodeJS.Timeout | null = null;

/**
 * Request Wake Lock to prevent screen/device from sleeping
 * Critical for long auction sessions (15-25+ minutes)
 */
export const requestWakeLock = async () => {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await (navigator as any).wakeLock.request('screen');
      console.log('🔒 Wake Lock acquired - screen will stay on');
      
      // Re-acquire wake lock if released (e.g., tab switch)
      wakeLock.addEventListener('release', () => {
        console.log('🔓 Wake Lock released');
      });
      
      return true;
    } else {
      console.log('⚠️ Wake Lock API not supported - using fallback keep-alive');
      return false;
    }
  } catch (err: any) {
    console.log('⚠️ Wake Lock request failed:', err.message);
    return false;
  }
};

/**
 * Release Wake Lock when no longer needed
 */
export const releaseWakeLock = async () => {
  if (wakeLock) {
    try {
      await wakeLock.release();
      wakeLock = null;
      console.log('🔓 Wake Lock released manually');
    } catch (err) {
      console.log('Wake Lock release error:', err);
    }
  }
};

/**
 * Start heartbeat to keep socket connection alive
 * Sends ping every 10 seconds for reliable 1+ hour idle sessions
 */
const startHeartbeat = () => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  
  heartbeatInterval = setInterval(() => {
    if (socketInstance && socketInstance.connected) {
      socketInstance.emit('heartbeat', { timestamp: Date.now() });
      // Also emit a ping to verify connection
      socketInstance.volatile.emit('ping');
    }
  }, 10000); // Every 10 seconds (more aggressive for long sessions)
  
  console.log('💓 Heartbeat started (10s interval)');
};

/**
 * Stop heartbeat interval
 */
const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    console.log('💔 Heartbeat stopped');
  }
};

/**
 * Keep-alive mechanism for background tabs
 * Uses periodic activity to prevent browser throttling
 */
const startKeepAlive = () => {
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  
  keepAliveInterval = setInterval(() => {
    // Perform minimal activity to keep tab active
    if (socketInstance && socketInstance.connected) {
      // Touch localStorage to keep activity
      const keepAliveTime = Date.now();
      localStorage.setItem('auction_keepalive', keepAliveTime.toString());
    }
  }, 5000); // Every 5 seconds (more aggressive)
  
  console.log('⏰ Keep-alive timer started (5s interval)');
};

/**
 * API ping to keep HTTP connection alive
 * Makes a lightweight API call every 45 seconds
 */
const startApiPing = () => {
  if (apiPingInterval) clearInterval(apiPingInterval);
  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  
  apiPingInterval = setInterval(async () => {
    try {
      // Lightweight ping to keep API connection alive
      const response = await fetch(`${API_URL.replace('/api', '')}`, {
        method: 'GET',
        credentials: 'include'
      });
      if (response.ok) {
        console.log('🌐 API keep-alive ping successful');
      }
    } catch (err) {
      // Silent fail - socket heartbeat is primary keep-alive
    }
  }, 45000); // Every 45 seconds
  
  console.log('🌐 API ping started (45s interval)');
};

/**
 * Stop keep-alive interval
 */
const stopKeepAlive = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  if (apiPingInterval) {
    clearInterval(apiPingInterval);
    apiPingInterval = null;
  }
};

/**
 * Handle visibility changes (tab switching, minimizing)
 * Re-acquire wake lock and reconnect socket when tab becomes visible
 */
const setupVisibilityHandler = () => {
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
  }
  
  visibilityHandler = async () => {
    if (document.visibilityState === 'visible') {
      console.log('👁️ Tab became visible - checking connections...');
      
      // Re-acquire wake lock
      await requestWakeLock();
      
      // Check and reconnect socket if needed
      if (socketInstance && !socketInstance.connected) {
        console.log('🔄 Reconnecting socket after tab switch...');
        socketInstance.connect();
      }
      
      // Restart heartbeat
      startHeartbeat();
    } else {
      console.log('👁️ Tab hidden - maintaining background connection...');
      // Keep heartbeat running even in background
    }
  };
  
  document.addEventListener('visibilitychange', visibilityHandler);
  console.log('👁️ Visibility handler registered');
};

/**
 * Initialize socket connection and join auctioneer-specific room
 * This ensures real-time updates are isolated per auctioneer
 * Returns the same socket instance for all calls (singleton pattern)
 */
export const initializeSocket = () => {
  // Return existing instance if already created
  if (socketInstance && socketInstance.connected) {
    console.log('♻️ Reusing existing socket instance:', socketInstance.id);
    return socketInstance;
  }

  console.log('🆕 Creating new socket instance...');
  socketInstance = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity, // Never stop trying to reconnect
    timeout: 20000,
    autoConnect: false, // Don't auto-connect, we'll connect manually after auth check
    // Keep connection alive during long auction sessions
    forceNew: false,
    multiplex: true
  });

  socketInstance.on('connect', () => {
    console.log('✓ Socket.io connected:', socketInstance.id);
    
    // Start keep-alive mechanisms for 1+ hour idle support
    startHeartbeat();
    startKeepAlive();
    startApiPing();
    setupVisibilityHandler();
    requestWakeLock();
    
    // Join auctioneer-specific room
    const userStr = localStorage.getItem('user');
    console.log('👤 User data from localStorage:', userStr ? 'exists' : 'missing');
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        console.log('👤 Parsed user:', user);
        
        const auctioneerId = user._id || user.userId || user.id;
        if (auctioneerId) {
          console.log(`📤 Emitting joinAuctioneer with ID: ${auctioneerId}`);
          socketInstance.emit('joinAuctioneer', auctioneerId);
          console.log(`✓ Joined auctioneer room: auctioneer_${auctioneerId}`);
        } else {
          console.warn('⚠️ No user ID found in user object:', user);
        }
      } catch (error) {
        console.error('❌ Error parsing user data:', error);
      }
    } else {
      console.warn('⚠️ No user data in localStorage - socket connected but not joined to room');
    }
  });

  socketInstance.on('disconnect', (reason: string) => {
    console.log('Socket.io disconnected:', reason);
    
    // If server disconnected us, try to reconnect immediately
    if (reason === 'io server disconnect') {
      console.log('🔄 Server disconnected - attempting immediate reconnect...');
      socketInstance.connect();
    }
    // Keep heartbeat and keep-alive running to facilitate reconnection
  });

  socketInstance.on('connect_error', (error: Error) => {
    console.error('Socket connection error:', error);
    // Don't stop keep-alive mechanisms - they'll help with reconnection
  });

  // Handle pong response from server
  socketInstance.on('pong', () => {
    console.log('🏓 Pong received from server');
  });

  // Only connect if user is authenticated
  const userStr = localStorage.getItem('user');
  if (userStr) {
    socketInstance.connect();
  } else {
    console.log('⏸️ Socket created but not connected (waiting for authentication)');
  }

  return socketInstance;
};

/**
 * Connect socket manually after authentication
 * Also initializes all keep-alive mechanisms
 */
export const connectSocket = () => {
  if (socketInstance && !socketInstance.connected) {
    console.log('🔗 Manually connecting socket after authentication...');
    socketInstance.connect();
    
    // Ensure keep-alive mechanisms are started
    requestWakeLock();
    setupVisibilityHandler();
  }
};

/**
 * Disconnect socket and cleanup all keep-alive mechanisms
 * Call this when user logs out
 */
export const disconnectSocket = () => {
  console.log('🔌 Disconnecting socket and cleaning up...');
  
  stopHeartbeat();
  stopKeepAlive();
  releaseWakeLock();
  
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  
  if (socketInstance) {
    socketInstance.disconnect();
  }
};

/**
 * Check if socket is currently connected
 */
export const isSocketConnected = (): boolean => {
  return socketInstance && socketInstance.connected;
};

/**
 * Get socket connection status for debugging
 */
export const getSocketStatus = () => {
  return {
    connected: socketInstance?.connected || false,
    id: socketInstance?.id || null,
    wakeLockActive: wakeLock !== null,
    heartbeatActive: heartbeatInterval !== null,
    keepAliveActive: keepAliveInterval !== null,
    apiPingActive: apiPingInterval !== null
  };
};

/**
 * Get auctioneer ID from localStorage
 */
export const getAuctioneerId = (): string | null => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user._id || user.userId || user.id || null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }
  return null;
};
