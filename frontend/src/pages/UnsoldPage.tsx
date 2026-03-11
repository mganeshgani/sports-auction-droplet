import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Player, Team } from '../types';
import confetti from 'canvas-confetti';
import { useAuth } from '../contexts/AuthContext';
import { playerService, teamService, clearCache, getStaleCached } from '../services/api';
import { initializeSocket } from '../services/socket';
import UnsoldPlayerCard from '../components/unsold/UnsoldPlayerCard';

const CELEBRATION_THROTTLE_MS = 3000;

const UnsoldPage: React.FC = () => {
  const { isAuctioneer } = useAuth();
  const [unsoldPlayers, setUnsoldPlayers] = useState<Player[]>(() => getStaleCached('players:unsold') || []);
  const [teams, setTeams] = useState<Team[]>(() => getStaleCached('teams:all') || []);
  const [loading, setLoading] = useState(() => !getStaleCached('players:unsold'));
  const [showModal, setShowModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [soldAmount, setSoldAmount] = useState<number>(0);
  const [selectedTeam, setSelectedTeam] = useState<string>('');

  const BACKEND_URL = process.env.REACT_APP_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5001';
  const lastCelebrationRef = useRef(0);
  
  const fetchUnsoldPlayers = useCallback(async (bypassCache = false) => {
    try {
      const data = await playerService.getUnsoldPlayers(!bypassCache); // Use cache unless bypassing
      setUnsoldPlayers(data);
    } catch (error) {
      console.error('Error fetching unsold players:', error);
    }
  }, []);

  const fetchTeams = useCallback(async (bypassCache = false) => {
    try {
      const data = await teamService.getAllTeams(!bypassCache); // Use cache unless bypassing
      setTeams(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchUnsoldPlayers(), fetchTeams()]);
      setLoading(false);
    };
    loadData();

    // Setup Socket.io for real-time updates
    const socket = initializeSocket();

    socket.on('connect', () => {
      console.log('✓ Unsold page connected to socket');
    });

    // Listen to relevant events — update state in-place from payloads
    socket.on('playerAdded', (newPlayer: any) => {
      // A newly added player won't be unsold — ignore
    });
    socket.on('playerDeleted', (data: any) => {
      const deletedId = data?.playerId || data?._id;
      if (deletedId) {
        setUnsoldPlayers(prev => prev.filter(p => p._id !== deletedId));
      }
    });
    socket.on('playerSold', (soldPlayer: any) => {
      // Remove from unsold list if it was there
      const id = soldPlayer?._id || soldPlayer?.player?._id;
      if (id) {
        setUnsoldPlayers(prev => prev.filter(p => p._id !== id));
      }
      // Update team in-place
      const team = soldPlayer?.team;
      if (team) {
        setTeams(prev => prev.map(t => t._id === team._id ? { ...t, ...team } : t));
      }
    });
    socket.on('playerMarkedUnsold', (player: any) => {
      if (player?._id) {
        setUnsoldPlayers(prev => {
          if (prev.some(p => p._id === player._id)) return prev;
          return [...prev, player];
        });
      }
    });
    socket.on('playerUpdated', (updatedPlayer: any) => {
      if (updatedPlayer?.status === 'unsold') {
        setUnsoldPlayers(prev => {
          const exists = prev.some(p => p._id === updatedPlayer._id);
          if (exists) return prev.map(p => p._id === updatedPlayer._id ? { ...p, ...updatedPlayer } : p);
          return [...prev, updatedPlayer];
        });
      } else if (updatedPlayer?._id) {
        setUnsoldPlayers(prev => prev.filter(p => p._id !== updatedPlayer._id));
      }
    });
    socket.on('dataReset', () => {
      clearCache();
      fetchUnsoldPlayers(true);
      fetchTeams(true);
    });

    socket.on('disconnect', () => {
      console.log('✗ Unsold page disconnected');
    });

    return () => {
      socket.off('connect');
      socket.off('playerAdded');
      socket.off('playerDeleted');
      socket.off('playerSold');
      socket.off('playerMarkedUnsold');
      socket.off('playerUpdated');
      socket.off('dataReset');
      socket.off('disconnect');
    };
  }, [fetchUnsoldPlayers, fetchTeams]);

  const handleAuctionClick = useCallback((player: Player) => {
    setSelectedPlayer(player);
    setSoldAmount(0);
    setSelectedTeam('');
    setShowModal(true);
  }, []);

  const handleAuctionConfirm = useCallback(async () => {
    if (!selectedPlayer || !selectedTeam || !soldAmount) {
      return;
    }

    // OPTIMIZED: Play confetti immediately (throttled to avoid jank at scale)
    const now = Date.now();
    if (now - lastCelebrationRef.current >= CELEBRATION_THROTTLE_MS) {
      lastCelebrationRef.current = now;
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    // OPTIMIZED: Update UI immediately (optimistic update)
    setTeams(prevTeams => 
      prevTeams.map(team => 
        team._id === selectedTeam 
          ? { 
              ...team, 
              filledSlots: team.filledSlots + 1,
              remainingBudget: (team.remainingBudget ?? team.budget ?? 0) - soldAmount,
              players: [...(team.players || []), selectedPlayer]
            }
          : team
      )
    );

    // Remove player from unsold list immediately
    setUnsoldPlayers(prev => prev.filter(p => p._id !== selectedPlayer._id));

    // Close modal immediately
    setShowModal(false);
    setSelectedPlayer(null);
    setSoldAmount(0);
    setSelectedTeam('');

    try {
      // Update player with sold status, team, and amount
      await playerService.updatePlayer(selectedPlayer._id, {
        status: 'sold',
        team: selectedTeam,
        soldAmount: soldAmount
      });

      // Clear cache and refresh in background (non-blocking)
      clearCache();
      fetchUnsoldPlayers();
      fetchTeams();
    } catch (error) {
      console.error('Error auctioning player:', error);
      // Revert optimistic update on error
      clearCache();
      await Promise.all([fetchUnsoldPlayers(), fetchTeams()]);
    }
  }, [selectedPlayer, selectedTeam, soldAmount, fetchUnsoldPlayers, fetchTeams]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Ultra-Compact Premium Header */}
      <div className="flex-shrink-0 border-b px-2 sm:px-4 py-1.5 sm:py-2" style={{
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(13, 17, 23, 0.9) 50%, rgba(0, 0, 0, 0.95) 100%)',
        borderBottom: '1.5px solid rgba(212, 175, 55, 0.3)',
        boxShadow: '0 2px 20px rgba(0, 0, 0, 0.6), 0 0 30px rgba(212, 175, 55, 0.08)'
      }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight leading-none" style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #fca5a5 50%, #dc2626 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 0 30px rgba(220, 38, 38, 0.3)'
            }}>Unsold Players</h1>
            <p className="text-gray-400 text-[10px] sm:text-xs font-medium tracking-wide mt-0.5">Players not sold in auction</p>
          </div>
          <div className="backdrop-blur-sm rounded-lg px-1.5 sm:px-2 py-1" style={{
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(10, 10, 10, 0.6) 50%, rgba(0, 0, 0, 0.7) 100%)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)'
          }}>
            <div>
              <p className="text-[8px] sm:text-[9px] text-gray-400 uppercase tracking-wider">Total Unsold</p>
              <p className="text-xs sm:text-sm font-black text-red-400 leading-none">{unsoldPlayers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Players Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="inline-block animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4" style={{
                borderColor: 'transparent',
                borderTopColor: '#dc2626'
              }}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl sm:text-2xl">🚫</span>
              </div>
            </div>
            <p className="mt-3 sm:mt-4 text-gray-400 font-medium text-sm sm:text-base">Loading unsold players...</p>
          </div>
        </div>
      ) : unsoldPlayers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-green-500/30">
              <span className="text-3xl sm:text-5xl">🎉</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">All Players Sold!</h3>
            <p className="text-gray-400 text-sm sm:text-base">Great job! No unsold players remaining.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 md:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {unsoldPlayers.map((player) => (
              <UnsoldPlayerCard
                key={player._id}
                player={player}
                isAuctioneer={isAuctioneer}
                onAuction={handleAuctionClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Auction Modal */}
      {showModal && selectedPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          style={{ background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(12px)' }}
          onClick={() => { setShowModal(false); setSelectedPlayer(null); setSoldAmount(0); setSelectedTeam(''); }}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(165deg, #0a0a0a 0%, #141414 40%, #0d0d0d 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.95), 0 0 80px rgba(16, 185, 129, 0.12), inset 0 1px 0 rgba(255,255,255,0.05)',
              maxHeight: 'calc(100vh - 2rem)'
            }}
          >
            {/* Top Accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.6) 50%, transparent 100%)' }}
            />

            {/* Header */}
            <div className="relative px-6 py-5" style={{
              background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.06) 0%, transparent 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
            }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Player Photo */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
                      border: '1.5px solid rgba(16, 185, 129, 0.25)'
                    }}
                  >
                    {selectedPlayer.photoUrl && selectedPlayer.photoUrl.trim() !== '' ? (
                      <img
                        src={selectedPlayer.photoUrl.startsWith('http') ? selectedPlayer.photoUrl : `${BACKEND_URL}${selectedPlayer.photoUrl}`}
                        alt={selectedPlayer.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-light" style={{ color: 'rgba(16, 185, 129, 0.7)' }}>{selectedPlayer.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-white">{selectedPlayer.name}</h2>
                    <p className="text-[11px] text-gray-500 font-medium">Auction this player</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowModal(false); setSelectedPlayer(null); setSoldAmount(0); setSelectedTeam(''); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
                  style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                >
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 12rem)' }}>
              <div className="p-6 space-y-5">
                {/* Amount Input */}
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1.5">Sold Amount (₹)</label>
                  <input
                    type="number"
                    value={soldAmount || ''}
                    onChange={(e) => setSoldAmount(Number(e.target.value))}
                    placeholder="Enter amount..."
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all duration-300"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(16, 185, 129, 0.4)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2), 0 0 0 3px rgba(16, 185, 129, 0.08)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)'; }}
                  />
                </div>

                {/* Team Selection */}
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1.5">Select Team</label>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-1">
                    {teams.map((team) => (
                      <button
                        key={team._id}
                        type="button"
                        onClick={() => setSelectedTeam(team._id)}
                        className="w-full px-3 py-2.5 rounded-xl text-left transition-all duration-200"
                        style={{
                          background: selectedTeam === team._id ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${selectedTeam === team._id ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255,255,255,0.05)'}`,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium ${selectedTeam === team._id ? 'text-emerald-300' : 'text-white'}`}>{team.name}</p>
                            <p className="text-[10px] text-gray-500">
                              Budget: ₹{team.remainingBudget?.toLocaleString() || 0} · {team.players.length}/{team.totalSlots || 15}
                            </p>
                          </div>
                          {selectedTeam === team._id && (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.3)' }}>
                              <span className="text-[10px] text-emerald-400">✓</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setSelectedPlayer(null); setSoldAmount(0); setSelectedTeam(''); }}
                    className="flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-[1.02]"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAuctionConfirm}
                    disabled={!soldAmount || !selectedTeam}
                    className="flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
                    style={{
                      background: (!soldAmount || !selectedTeam) ? 'rgba(16, 185, 129, 0.2)' : 'linear-gradient(135deg, #10b981 0%, #34d399 50%, #10b981 100%)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      boxShadow: (!soldAmount || !selectedTeam) ? 'none' : '0 4px 20px rgba(16, 185, 129, 0.3)',
                      color: '#fff'
                    }}
                  >
                    Confirm Auction
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Accent */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(16, 185, 129, 0.2) 50%, transparent 100%)' }}
            />
          </div>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #ef4444, #f97316);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #dc2626, #ea580c);
        }
      `}</style>
    </div>
  );
};

export default UnsoldPage;
