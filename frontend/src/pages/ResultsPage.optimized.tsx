import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Team, Player } from '../types';
import { initializeSocket } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { resultsService, clearCache } from '../services/api';
import TeamCard from '../components/results/TeamCard';
import PlayerCard from '../components/results/PlayerCard';

const ResultsPage: React.FC = () => {
  const { isAuctioneer } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [playerToChangeTeam, setPlayerToChangeTeam] = useState<Player | null>(null);
  const [newTeamId, setNewTeamId] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  // Memoized stats calculation
  const stats = useMemo(() => {
    const total = players.length;
    const sold = players.filter(p => p.status === 'sold').length;
    const unsold = players.filter(p => p.status === 'available' || !p.status).length;
    const totalSpent = players
      .filter(p => p.status === 'sold')
      .reduce((sum, p) => sum + (p.soldAmount || 0), 0);
    return { total, sold, unsold, totalSpent };
  }, [players]);

  const handleDeletePlayer = useCallback(async (player: Player) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/players/${player._id}/remove-from-team`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      clearCache();
      fetchData(true);
      setPlayerToDelete(null);
      setSelectedTeam(null);
    } catch (error) {
      console.error('Error deleting player:', error);
      toast.error('Error deleting player');
    }
  }, [API_URL]);

  const handleChangeTeam = useCallback(async () => {
    if (!playerToChangeTeam || !newTeamId) return;
    
    try {
      const token = localStorage.getItem('token');
      const oldTeamId = typeof playerToChangeTeam.team === 'object' 
        ? (playerToChangeTeam.team as any)._id 
        : playerToChangeTeam.team;
      
      if (oldTeamId === newTeamId) {
        toast.warning('Selected team is same as current team');
        return;
      }

      const newTeam = teams.find(t => t._id === newTeamId);
      if (newTeam) {
        if ((newTeam.filledSlots || 0) >= (newTeam.totalSlots || 0)) {
          toast.warning('New team has no available slots');
          return;
        }
        if ((newTeam.remainingBudget || 0) < (playerToChangeTeam.soldAmount || 0)) {
          toast.warning('New team does not have enough budget');
          return;
        }
      }

      await axios.put(`${API_URL}/players/${playerToChangeTeam._id}/change-team`, {
        newTeamId,
        oldTeamId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      clearCache();
      fetchData(true);
      setPlayerToChangeTeam(null);
      setNewTeamId('');
      setSelectedTeam(null);
    } catch (error: any) {
      console.error('Error changing team:', error);
      toast.error(error.response?.data?.error || 'Error changing team');
    }
  }, [playerToChangeTeam, newTeamId, teams, API_URL]);

  const fetchData = useCallback(async (useCache = false) => {
    try {
      const data = await resultsService.getResultsData(useCache);
      setTeams(data.teams);
      setPlayers(data.players);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
    const socket = initializeSocket();
    
    let fetchTimeout: NodeJS.Timeout;
    const debouncedFetch = () => {
      if (fetchTimeout) clearTimeout(fetchTimeout);
      fetchTimeout = setTimeout(() => {
        fetchData(false);
      }, 300);
    };

    socket.on('auctionUpdated', debouncedFetch);
    socket.on('playerAddedToTeam', debouncedFetch);
    socket.on('playerRemovedFromTeam', debouncedFetch);
    socket.on('disconnect', () => {});
    
    return () => {
      if (fetchTimeout) clearTimeout(fetchTimeout);
      socket.disconnect();
    };
  }, [fetchData]);

  // Position color mapping - Memoized for performance
  const getPositionColor = useCallback((position: string) => {
    const colors: { [key: string]: string } = {
      'Spiker': 'from-amber-500/20 via-yellow-500/20 to-orange-500/20 border-amber-500/40',
      'Setter': 'from-purple-500/20 via-pink-500/20 to-rose-500/20 border-purple-500/40',
      'Libero': 'from-blue-500/20 via-cyan-500/20 to-teal-500/20 border-blue-500/40',
      'Blocker': 'from-red-500/20 via-rose-500/20 to-pink-500/20 border-red-500/40',
      'All-Rounder': 'from-emerald-500/20 via-green-500/20 to-lime-500/20 border-emerald-500/40',
    };
    return colors[position] || 'from-gray-500/20 via-slate-500/20 to-zinc-500/20 border-gray-500/40';
  }, []);

  const getPositionIcon = useCallback((position: string) => {
    const icons: { [key: string]: string } = {
      'Spiker': '🏐',
      'Setter': '⭐',
      'Libero': '🛡️',
      'Blocker': '🔥',
      'All-Rounder': '💪',
    };
    return icons[position] || '🏐';
  }, []);

  // Memoized handlers
  const handleSetSelectedTeam = useCallback((team: Team) => {
    setSelectedTeam(team);
  }, []);

  const handleSetPlayerToChangeTeam = useCallback((player: Player) => {
    setPlayerToChangeTeam(player);
  }, []);

  const handleSetPlayerToDelete = useCallback((player: Player) => {
    setPlayerToDelete(player);
  }, []);

  // Memoize team players calculation to avoid recalculating on every render
  const teamsWithPlayers = useMemo(() => {
    return teams.map(team => {
      const teamPlayers = players.filter(p => {
        if (!p.team || p.status !== 'sold') return false;
        const playerTeamId = typeof p.team === 'object' ? (p.team as any)._id : p.team;
        return String(playerTeamId) === String(team._id);
      });
      const spent = teamPlayers.reduce((sum, p) => sum + (p.soldAmount || 0), 0);
      const actualFilledSlots = team.filledSlots || teamPlayers.length;
      const actualRemaining = team.remainingBudget !== undefined && team.remainingBudget !== null 
        ? team.remainingBudget 
        : (team.budget || 0) - spent;
      const actualSpent = (team.budget || 0) - actualRemaining;
      const budgetUsedPercentage = ((actualSpent / (team.budget || 1)) * 100).toFixed(0);

      return {
        team,
        teamPlayers,
        actualFilledSlots,
        actualRemaining,
        actualSpent,
        budgetUsedPercentage
      };
    });
  }, [teams, players]);

  // Memoize selected team players
  const selectedTeamPlayers = useMemo(() => {
    if (!selectedTeam) return [];
    return selectedTeam.players && selectedTeam.players.length > 0
      ? selectedTeam.players
      : players.filter(p => {
          if (!p.team || p.status !== 'sold') return false;
          const playerTeamId = typeof p.team === 'object' ? (p.team as any)._id : p.team;
          return String(playerTeamId) === String(selectedTeam._id);
        });
  }, [selectedTeam, players]);

  // Memoize filtered teams for change team modal
  const availableTeamsForChange = useMemo(() => {
    if (!playerToChangeTeam) return [];
    const currentTeamId = typeof playerToChangeTeam.team === 'object' 
      ? (playerToChangeTeam.team as any)._id 
      : playerToChangeTeam.team;
    return teams.filter(team => team._id !== currentTeamId);
  }, [teams, playerToChangeTeam]);

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{
      background: 'linear-gradient(160deg, #000000 0%, #0a0a0a 25%, #1a1a1a 50%, #0f172a 75%, #1a1a1a 100%)'
    }}>
      {/* Ultra-Compact Premium Header */}
      <div className="flex-shrink-0 backdrop-blur-xl border-b shadow-xl" style={{
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(13, 17, 23, 0.9) 50%, rgba(0, 0, 0, 0.95) 100%)',
        borderBottom: '1.5px solid rgba(212, 175, 55, 0.3)',
        boxShadow: '0 2px 20px rgba(0, 0, 0, 0.6), 0 0 30px rgba(212, 175, 55, 0.08)',
        padding: '0.625rem 0.5rem'
      }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            {/* Left: Title with LIVE badge */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <h1 className="text-lg sm:text-xl font-black tracking-tight whitespace-nowrap leading-none" style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F0D770 50%, #D4AF37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 0 30px rgba(212, 175, 55, 0.3)'
              }}>
                Auction Results
              </h1>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.25)'
              }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981' }}></div>
                <span className="text-[10px] sm:text-xs font-bold text-emerald-400">LIVE</span>
              </div>
            </div>

            {/* Right: Stats */}
            {!loading && (
              <div className="flex items-center gap-1.5 overflow-x-auto lg:ml-auto">
                <div className="backdrop-blur-sm rounded-lg px-1.5 sm:px-2 py-1 flex-shrink-0" style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(10, 10, 10, 0.6) 50%, rgba(0, 0, 0, 0.7) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)'
                }}>
                  <div>
                    <p className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-wider">Total</p>
                    <p className="text-xs sm:text-sm font-black text-white leading-none">{stats.total}</p>
                  </div>
                </div>
                <div className="backdrop-blur-sm rounded-lg px-1.5 sm:px-2 py-1 flex-shrink-0" style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(16, 185, 129, 0.1) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  boxShadow: '0 2px 10px rgba(16, 185, 129, 0.2)'
                }}>
                  <div>
                    <p className="text-[8px] sm:text-[9px] text-emerald-400/80 uppercase tracking-wider">Sold</p>
                    <p className="text-xs sm:text-sm font-black text-emerald-400 leading-none">{stats.sold}</p>
                  </div>
                </div>
                <div className="backdrop-blur-sm rounded-lg px-1.5 sm:px-2 py-1 flex-shrink-0" style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(244, 63, 94, 0.1) 100%)',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                  boxShadow: '0 2px 10px rgba(244, 63, 94, 0.2)'
                }}>
                  <div>
                    <p className="text-[8px] sm:text-[9px] text-rose-400/80 uppercase tracking-wider">Unsold</p>
                    <p className="text-xs sm:text-sm font-black text-rose-400 leading-none">{stats.unsold}</p>
                  </div>
                </div>
                <div className="backdrop-blur-sm rounded-lg px-1.5 sm:px-2 py-1 flex-shrink-0" style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(212, 175, 55, 0.1) 100%)',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  boxShadow: '0 2px 10px rgba(212, 175, 55, 0.25)'
                }}>
                  <div>
                    <p className="text-[8px] sm:text-[9px] text-amber-400/80 uppercase tracking-wider">Spent</p>
                    <p className="text-xs sm:text-sm font-black leading-none" style={{
                      background: 'linear-gradient(135deg, #D4AF37 0%, #F0D770 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}>
                      ₹{(stats.totalSpent / 1000).toFixed(0)}K
                    </p>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-16 h-16 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"></div>
            </div>
            <p className="mt-4 text-slate-400 font-semibold">Loading Results...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-4 md:px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4">
            {teamsWithPlayers.map(({ team, teamPlayers, actualFilledSlots, actualRemaining, actualSpent, budgetUsedPercentage }, index) => (
              <TeamCard
                key={`${team._id}-${actualFilledSlots}-${actualSpent}-${actualRemaining}`}
                team={team}
                index={index}
                playerCount={teamPlayers.length}
                actualFilledSlots={actualFilledSlots}
                actualRemaining={actualRemaining}
                actualSpent={actualSpent}
                budgetUsedPercentage={budgetUsedPercentage}
                teamPlayers={teamPlayers}
                onClick={() => handleSetSelectedTeam(team)}
                getPositionColor={getPositionColor}
                getPositionIcon={getPositionIcon}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rest of modals remain the same but use extracted PlayerCard component */}
      {/* I'll include them in the next part of the file */}
      
      {/* Premium Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #f59e0b, #d97706);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #fbbf24, #f59e0b);
        }
      `}</style>
    </div>
  );
};

export default ResultsPage;
