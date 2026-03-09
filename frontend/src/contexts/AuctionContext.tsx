import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { Player } from '../types';
import { initializeSocket, getAuctioneerId } from '../services/socket';

interface AuctionContextType {
  currentPlayer: Player | null;
  currentBid: number;
  currentBidder: string | null;
  placeBid: (amount: number, teamId: string) => void;
  startPlayerAuction: (player: Player) => void;
  isConnected: boolean;
  bidTimeLeft: number;
}

const AuctionContext = createContext<AuctionContextType | null>(null);

export const useAuction = () => {
  const context = useContext(AuctionContext);
  if (!context) {
    throw new Error('useAuction must be used within an AuctionProvider');
  }
  return context;
};

export const AuctionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<typeof Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [currentBidder, setCurrentBidder] = useState<string | null>(null);
  const [bidTimeLeft, setBidTimeLeft] = useState(10);

  useEffect(() => {
    // Initialize socket with auctioneer room isolation
    const socketInstance = initializeSocket();

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('auctionStarted', (data: { player: Player; startingBid: number }) => {
      setCurrentPlayer(data.player);
      setCurrentBid(data.startingBid);
      setCurrentBidder(null);
      setBidTimeLeft(10);
    });

    socketInstance.on('bidUpdate', (data: { amount: number; teamId: string }) => {
      setCurrentBid(data.amount);
      setCurrentBidder(data.teamId);
      setBidTimeLeft(10);
    });

    socketInstance.on('auctionComplete', (result: {
      player: Player;
      soldPrice: number;
      soldTo: string | null;
      status: 'sold' | 'unsold';
    }) => {
      setCurrentPlayer(null);
      setCurrentBid(0);
      setCurrentBidder(null);
      setBidTimeLeft(0);
    });

    setSocket(socketInstance);

    return () => {
      // Remove listeners only — do NOT disconnect the shared singleton
      socketInstance.off('auctionStarted');
      socketInstance.off('bidUpdate');
      socketInstance.off('auctionComplete');
      socketInstance.off('connect');
      socketInstance.off('disconnect');
    };
  }, []);

  useEffect(() => {
    if (!currentPlayer) return;

    const timer = setInterval(() => {
      setBidTimeLeft((prev) => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentPlayer]);

  // Commented out as currently unused
  // const joinAuction = (teamId: string) => {
  //   if (socket) {
  //     socket.emit('joinAuction', teamId);
  //   }
  // };

  const placeBid = (amount: number, teamId: string) => {
    if (socket) {
      const auctioneerId = getAuctioneerId();
      socket.emit('placeBid', { amount, teamId, auctioneerId });
    }
  };

  const startPlayerAuction = (player: Player) => {
    if (socket) {
      const auctioneerId = getAuctioneerId();
      socket.emit('startPlayerAuction', { player, auctioneerId });
    }
  };

  return (
    <AuctionContext.Provider
      value={{
        currentPlayer,
        currentBid,
        currentBidder,
        placeBid,
        startPlayerAuction,
        isConnected,
        bidTimeLeft
      }}
    >
      {children}
    </AuctionContext.Provider>
  );
};