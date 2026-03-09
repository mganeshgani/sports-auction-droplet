import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Player } from '../types';
import { formatCurrency } from '../utils/formatters';
import RegistrationLinkGenerator from '../components/RegistrationLinkGenerator';
import EditPlayerModal from '../components/EditPlayerModal';
import PlayerDetailModal from '../components/PlayerDetailModal';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { playerService, clearCache } from '../services/api';
import { initializeSocket } from '../services/socket';

const PlayersPage: React.FC = () => {
  const { isAuctioneer, user, refreshUser } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'sold' | 'unsold'>('all');
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const BACKEND_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001';

  const fetchPlayers = useCallback(async (bypassCache = false) => {
    setLoading(true);
    try {
      const data = await playerService.getAllPlayers(!bypassCache); // Use cache unless bypassing
      setPlayers(data);
      
      // Debug: Log first player's photo URL to check conversion
      if (data.length > 0 && data[0].photoUrl) {
        console.log('✓ Sample Photo URL:', data[0].photoUrl);
        console.log('✓ Player Name:', data[0].name);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  // Socket.IO listener for real-time player updates with debouncing
  useEffect(() => {
    const socket = initializeSocket();
    let isComponentMounted = true;

    console.log('🔌 PlayersPage: Setting up socket listeners', socket.id);
    console.log('🔌 Socket connected:', socket.connected);

    // Test socket connection
    const handleConnect = () => {
      console.log('✅ Socket connected on PlayersPage:', socket.id);
      // Re-fetch players on reconnect to ensure sync
      if (isComponentMounted) {
        clearCache();
        fetchPlayers(true);
      }
    };

    socket.on('connect', handleConnect);

    // Listen for playerAdded event - directly add to state for immediate update
    const handlePlayerAdded = (newPlayer: Player) => {
      if (!isComponentMounted) return;
      console.log('✅✅✅ PLAYER ADDED EVENT RECEIVED:', newPlayer.name, newPlayer);
      // Immediately add to local state for instant UI update
      setPlayers(prevPlayers => {
        // Check if player already exists to avoid duplicates
        const exists = prevPlayers.some(p => p._id === newPlayer._id);
        if (exists) {
          console.log('⚠️ Player already exists, updating instead');
          return prevPlayers.map(p => p._id === newPlayer._id ? newPlayer : p);
        }
        console.log('➕ Adding new player to list');
        return [...prevPlayers, newPlayer];
      });
      // Refresh user to update limits
      refreshUser();
    };

    // Listen for playerUpdated event
    const handlePlayerUpdated = (updatedPlayer: Player) => {
      if (!isComponentMounted) return;
      console.log('✅ Player updated via socket:', updatedPlayer.name);
      // Immediately update in local state
      setPlayers(prevPlayers => 
        prevPlayers.map(p => p._id === updatedPlayer._id ? updatedPlayer : p)
      );
    };

    // Listen for playerDeleted event
    const handlePlayerDeleted = (deletedPlayer: Player) => {
      if (!isComponentMounted) return;
      console.log('✅ Player deleted via socket:', deletedPlayer._id);
      // Immediately remove from local state
      const deletedId = typeof deletedPlayer === 'object' ? (deletedPlayer._id || (deletedPlayer as any).playerId) : deletedPlayer;
      setPlayers(prevPlayers => prevPlayers.filter(p => p._id !== deletedId));
      // Refresh user to update limits
      refreshUser();
    };

    socket.on('playerAdded', handlePlayerAdded);
    socket.on('playerUpdated', handlePlayerUpdated);
    socket.on('playerDeleted', handlePlayerDeleted);

    // Cleanup on unmount
    return () => {
      console.log('🔌 PlayersPage: Cleaning up socket listeners');
      isComponentMounted = false;
      socket.off('connect', handleConnect);
      socket.off('playerAdded', handlePlayerAdded);
      socket.off('playerUpdated', handlePlayerUpdated);
      socket.off('playerDeleted', handlePlayerDeleted);
    };
  }, [fetchPlayers, refreshUser]);

  const handleDeletePlayer = useCallback(async (playerId: string) => {
    try {
      const token = localStorage.getItem('token');
      // Optimistic update - remove from UI immediately
      setPlayers(prevPlayers => prevPlayers.filter(p => p._id !== playerId));
      
      await axios.delete(`${BACKEND_URL}/api/players/${playerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      clearCache(); // Clear cache after deletion
      // No need to fetchPlayers - socket event will trigger refresh if needed
    } catch (error: any) {
      console.error('Error deleting player:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete player';
      alert(errorMessage);
      // Revert on error
      clearCache();
      fetchPlayers(true);
    }
  }, [BACKEND_URL, fetchPlayers]);

  const filteredPlayers = useMemo(() => 
    filter === 'all' 
      ? players 
      : players.filter(p => p.status === filter),
    [filter, players]
  );

  // Virtualization setup
  const gridRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const updateColumns = () => {
      const w = window.innerWidth;
      if (w >= 1280) setColumns(5);
      else if (w >= 1024) setColumns(4);
      else if (w >= 640) setColumns(3);
      else setColumns(2);
    };
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const rows = useMemo(() => {
    const result: Player[][] = [];
    for (let i = 0; i < filteredPlayers.length; i += columns) {
      result.push(filteredPlayers.slice(i, i + columns));
    }
    return result;
  }, [filteredPlayers, columns]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => gridRef.current,
    estimateSize: () => 280,
    overscan: 5,
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Ultra-Compact Premium Header */}
      <div className="relative flex-shrink-0 border-b px-2 sm:px-4 py-1.5 sm:py-2 overflow-hidden" style={{
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(13, 17, 23, 0.9) 50%, rgba(0, 0, 0, 0.95) 100%)',
        borderBottom: '1.5px solid rgba(212, 175, 55, 0.3)',
        boxShadow: '0 2px 20px rgba(0, 0, 0, 0.6), 0 0 30px rgba(212, 175, 55, 0.08)'
      }}>
        {/* Subtle Background Animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <div className="aurora-bg-header"></div>
          <div className="floating-orbs-header">
            <div className="orb-header orb-header-1"></div>
            <div className="orb-header orb-header-2"></div>
            <div className="orb-header orb-header-3"></div>
          </div>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          {/* Title - Compact */}
          <div className="flex items-center gap-2 flex-1">
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight leading-none" style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F0D770 50%, #D4AF37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 0 30px rgba(212, 175, 55, 0.3)'
              }}>Players Management</h1>
              <p className="text-gray-400 text-[10px] sm:text-xs font-medium tracking-wide mt-0.5">Manage and track players</p>
            </div>
          </div>

          {/* Action Buttons - Compact */}
          {isAuctioneer && (
            <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  // Use actual player count instead of cached user usage
                  const currentPlayerCount = players.length;
                  const maxPlayers = user?.limits?.maxPlayers;
                  const isLimitReached = maxPlayers && currentPlayerCount >= maxPlayers;
                  
                  if (isLimitReached) {
                    alert(`⚠️ Player Limit Reached!\n\nYou have reached your maximum player limit of ${maxPlayers}.\n\nCurrent: ${currentPlayerCount} / ${maxPlayers}\n\nPlease contact your administrator to increase your limit.`);
                    return;
                  }
                  setShowAddModal(true);
                }}
                className="group relative flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-300 overflow-hidden flex-1 sm:flex-none"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                  color: 'white',
                  border: '1.5px solid rgba(16, 185, 129, 0.5)',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3), 0 0 30px rgba(16, 185, 129, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px) scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(16, 185, 129, 0.5), 0 0 40px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.3), 0 0 30px rgba(16, 185, 129, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15)';
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700 ease-out" style={{ transform: 'translateX(-100%)' }}></div>
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="relative z-10 tracking-wide">Add Player</span>
              </button>
              <Link
                to="/form-builder"
                className="group relative flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all duration-300 overflow-hidden flex-1 sm:flex-none"
                style={{
                  background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)',
                  color: '#1e293b',
                  border: '1.5px solid rgba(251, 191, 36, 0.6)',
                  boxShadow: '0 4px 16px rgba(251, 191, 36, 0.4), 0 0 30px rgba(251, 191, 36, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px) scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 6px 24px rgba(251, 191, 36, 0.6), 0 0 40px rgba(251, 191, 36, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(251, 191, 36, 0.4), 0 0 30px rgba(251, 191, 36, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:translate-x-full transition-transform duration-700 ease-out" style={{ transform: 'translateX(-100%)' }}></div>
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="relative z-10 tracking-wide">Form Builder</span>
              </Link>
              <RegistrationLinkGenerator />
            </div>
          )}

          {/* Stats Card */}
          <div className="backdrop-blur-sm rounded-lg px-1.5 sm:px-2 py-1 hidden sm:block" style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(10, 10, 10, 0.6) 50%, rgba(0, 0, 0, 0.7) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)'
          }}>
            <div>
              <p className="text-[8px] sm:text-[9px] text-gray-400 uppercase tracking-wider">Total</p>
              <p className="text-xs sm:text-sm font-black leading-none" style={{ color: '#D4AF37' }}>{players.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs - Ultra Compact */}
      <div className="flex-shrink-0 px-2 sm:px-4 py-1.5 sm:py-2 border-b" style={{
        background: 'rgba(0, 0, 0, 0.5)',
        borderBottom: '1px solid rgba(212, 175, 55, 0.2)'
      }}>
        <div className="flex gap-1 flex-wrap">
          {(['all', 'available', 'sold', 'unsold'] as const).map((f) => {
            const count = f === 'all' ? players.length : players.filter(p => p.status === f).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="group relative px-2 sm:px-3 py-1 sm:py-1.5 rounded-md font-bold text-[10px] sm:text-xs transition-all duration-300 capitalize"
                style={filter === f ? {
                  background: 'linear-gradient(135deg, #D4AF37 0%, #F0D770 50%, #D4AF37 100%)',
                  border: '1.5px solid rgba(212, 175, 55, 0.5)',
                  boxShadow: '0 2px 10px rgba(212, 175, 55, 0.3)',
                  color: '#000000',
                  transform: 'scale(1.03)'
                } : {
                  color: '#9ca3af',
                  background: 'transparent',
                  border: '1.5px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (filter !== f) {
                    e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)';
                    e.currentTarget.style.transform = 'scale(1.03)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (filter !== f) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
              >
                <span>{f}</span>
                <span className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-black" style={
                  filter === f 
                    ? { background: 'rgba(0, 0, 0, 0.2)' }
                    : { background: '#374151' }
                }>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Players Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="inline-block animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4" style={{
                borderColor: 'transparent',
                borderTopColor: '#D4AF37'
              }}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl sm:text-2xl">⚽</span>
              </div>
            </div>
            <p className="mt-3 sm:mt-4 text-gray-400 font-medium text-sm sm:text-base">Loading players...</p>
          </div>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(240, 215, 112, 0.2) 100%)',
              border: '2px solid rgba(212, 175, 55, 0.4)',
              boxShadow: '0 0 30px rgba(212, 175, 55, 0.3)'
            }}>
              <span className="text-3xl sm:text-5xl">🏐</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
              {filter === 'all' ? 'No Players Yet' : `No ${filter} Players`}
            </h3>
            <p className="text-gray-400 text-sm sm:text-base">
              {filter === 'all' 
                ? 'Share the registration link to add players to the auction.' 
                : `No players with status "${filter}" found.`}
            </p>
          </div>
        </div>
      ) : (
        <div ref={gridRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 md:p-5">
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => (
              <div
                key={virtualRow.index}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-4">
            {rows[virtualRow.index].map((player) => {
              const isSold = player.status === 'sold';
              const isUnsold = player.status === 'unsold';
              
              return (
                <div
                  key={player._id}
                  className="group relative"
                >
                  <div 
                    className="relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:-translate-y-1"
                    style={{
                      background: '#0a0a0a',
                      boxShadow: '0 8px 40px -8px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.06)',
                    }}
                    onClick={() => setSelectedPlayer(player)}
                  >
                    {/* Full-bleed Photo Area */}
                    <div className="relative w-full aspect-[3/4] overflow-hidden">
                      {/* Photo or Gradient Placeholder */}
                      {player.photoUrl && player.photoUrl.trim() !== '' ? (
                        <img 
                          src={player.photoUrl.startsWith('http') ? player.photoUrl : `${BACKEND_URL}${player.photoUrl}`} 
                          alt={player.name}
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : null}
                      
                      {/* Fallback Initial (shown if no photo or on error) */}
                      {(!player.photoUrl || player.photoUrl.trim() === '') && (
                        <div className="absolute inset-0 flex items-center justify-center"
                          style={{ background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
                        >
                          <span className="text-5xl font-extralight tracking-tight text-white/30">
                            {player.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Cinematic Bottom Gradient */}
                      <div className="absolute inset-0" style={{
                        background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.0) 55%, rgba(0,0,0,0.15) 100%)'
                      }} />

                      {/* Top-left: Status Badge */}
                      <div className="absolute top-2.5 left-2.5">
                        <div className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider backdrop-blur-md"
                          style={{
                            background: isSold ? 'rgba(16, 185, 129, 0.2)' : isUnsold ? 'rgba(239, 68, 68, 0.2)' : 'rgba(212, 175, 55, 0.2)',
                            border: `1px solid ${isSold ? 'rgba(16,185,129,0.35)' : isUnsold ? 'rgba(239,68,68,0.35)' : 'rgba(212,175,55,0.35)'}`,
                            color: isSold ? '#6ee7b7' : isUnsold ? '#fca5a5' : '#fde68a',
                          }}
                        >
                          {player.status}
                        </div>
                      </div>

                      {/* Bottom Info Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 pb-3.5">
                        <h3 className="text-[15px] font-bold text-white truncate leading-tight tracking-tight drop-shadow-lg">
                          {player.name}
                        </h3>
                        <div className="flex items-center justify-between mt-1">
                          {isSold && player.soldAmount ? (
                            <span className="text-sm font-bold" style={{ color: '#6ee7b7' }}>
                              {formatCurrency(player.soldAmount)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-gray-400 font-medium">
                              {isSold ? 'Sold' : isUnsold ? 'Unsold' : 'Available'}
                            </span>
                          )}
                          {isSold && player.team && (
                            <span className="text-[10px] text-gray-400 truncate ml-2 max-w-[50%]">
                              {typeof player.team === 'object' && player.team !== null ? (player.team as any).name : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Auctioneer Quick Actions — top-right, over the image */}
                    {isAuctioneer && (
                      <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingPlayer(player); }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                          style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }}
                          title="Edit"
                        >
                          <svg className="w-3.5 h-3.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(player._id); }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                          style={{ background: 'rgba(239,68,68,0.2)', backdropFilter: 'blur(12px)', border: '1px solid rgba(239,68,68,0.3)' }}
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Hover border glow */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{ boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.15), 0 0 30px rgba(212, 175, 55, 0.12)' }}
                    />
                  </div>
                </div>
              );
            })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Player Modal */}
      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onSuccess={() => {
            clearCache(); // Clear cache before fetching fresh data
            fetchPlayers(true); // BYPASS CACHE
            setEditingPlayer(null);
          }}
        />
      )}

      {/* Add Player Modal */}
      {showAddModal && (
        <EditPlayerModal
          player={null}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            console.log('✅ Add player success callback - refreshing list');
            clearCache(); // Clear cache before fetching fresh data
            fetchPlayers(true); // BYPASS CACHE - force refresh
            refreshUser(); // Update user limits
            setShowAddModal(false);
          }}
        />
      )}

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {/* Custom Scrollbar Styles + Header Animation */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #3b82f6, #8b5cf6);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #2563eb, #7c3aed);
        }

        /* Header Aurora Animation */
        @keyframes auroraHeader {
          0%, 100% {
            transform: translateX(0) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translateX(20px) scale(1.05);
            opacity: 0.5;
          }
        }

        .aurora-bg-header {
          position: absolute;
          width: 150%;
          height: 150%;
          top: -25%;
          left: -25%;
          background: radial-gradient(ellipse at 30% 50%, rgba(99, 102, 241, 0.2) 0%, transparent 50%),
                      radial-gradient(ellipse at 70% 50%, rgba(168, 85, 247, 0.2) 0%, transparent 50%);
          animation: auroraHeader 6s ease-in-out infinite;
          filter: blur(30px);
        }

        /* Header Floating Orbs */
        @keyframes floatHeader {
          0%, 100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(20px, -10px);
          }
        }

        .floating-orbs-header {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .orb-header {
          position: absolute;
          border-radius: 50%;
          filter: blur(15px);
          opacity: 0.4;
        }

        .orb-header-1 {
          width: 80px;
          height: 80px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.5), transparent);
          top: -20%;
          left: 20%;
          animation: floatHeader 5s ease-in-out infinite;
        }

        .orb-header-2 {
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.4), transparent);
          top: -30%;
          right: 30%;
          animation: floatHeader 6s ease-in-out infinite 1s;
        }

        .orb-header-3 {
          width: 70px;
          height: 70px;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.5), transparent);
          bottom: -20%;
          left: 60%;
          animation: floatHeader 7s ease-in-out infinite 2s;
        }
      `}</style>
      <ConfirmModal
        open={!!deleteConfirmId}
        title="Delete Player?"
        message="Are you sure you want to delete this player? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteConfirmId) handleDeletePlayer(deleteConfirmId);
          setDeleteConfirmId(null);
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};

export default PlayersPage;
