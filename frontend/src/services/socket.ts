import io from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5001';

// Singleton socket instance
let socketInstance: any = null;

// Keep-alive state
let heartbeatInterval: NodeJS.Timeout | null = null;
let visibilityHandler: (() => void) | null = null;

/**
 * Start heartbeat to keep socket connection alive
 * Sends ping every 10 seconds for reliable long sessions
 */
const startHeartbeat = () => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  
  heartbeatInterval = setInterval(() => {
    if (socketInstance && socketInstance.connected) {
      socketInstance.emit('heartbeat', { timestamp: Date.now() });
      socketInstance.volatile.emit('ping');
    }
  }, 10000);
};

/**
 * Stop heartbeat interval
 */
const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

/**
 * Handle visibility changes (tab switching, minimizing)
 * Reconnect socket when tab becomes visible
 */
const setupVisibilityHandler = () => {
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
  }
  
  visibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      if (socketInstance && !socketInstance.connected) {
        socketInstance.connect();
      }
      startHeartbeat();
    }
  };
  
  document.addEventListener('visibilitychange', visibilityHandler);
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
    
    startHeartbeat();
    setupVisibilityHandler();
    
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
  });

  socketInstance.on('connect_error', (error: Error) => {
    console.error('Socket connection error:', error);
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
  }
};

/**
 * Disconnect socket and cleanup all keep-alive mechanisms
 * Call this when user logs out
 */
export const disconnectSocket = () => {
  stopHeartbeat();
  
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
    heartbeatActive: heartbeatInterval !== null
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
