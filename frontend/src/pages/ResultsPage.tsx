import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Team, Player } from '../types';
import { initializeSocket } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { resultsService, clearCache, getStaleCached } from '../services/api';
import TeamCard from '../components/results/TeamCard';
import { useDisplaySettings } from '../hooks/useDisplaySettings';
import { formatCurrency } from '../utils/formatters';

const ResultsPage: React.FC = () => {
  const { isAuctioneer } = useAuth();
  const [teams, setTeams] = useState<Team[]>(() => getStaleCached('results:data')?.teams || []);
  const [players, setPlayers] = useState<Player[]>(() => getStaleCached('results:data')?.players || []);
  const [loading, setLoading] = useState(() => !getStaleCached('results:data'));
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [playerToChangeTeam, setPlayerToChangeTeam] = useState<Player | null>(null);
  const [newTeamId, setNewTeamId] = useState<string>('');
  const [showTop3Modal, setShowTop3Modal] = useState(false);

  
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  
  // Display settings for dynamic fields
  const { getEnabledFields } = useDisplaySettings();
  const enabledFields = useMemo(() => getEnabledFields(), [getEnabledFields]);

  // Memoize stats calculation
  const stats = useMemo(() => {
    const sold = players.filter((p: Player) => p.status === 'sold');
    const unsold = players.filter((p: Player) => p.status === 'unsold');
    const available = players.filter((p: Player) => p.status === 'available');
    const totalSpent = sold.reduce((sum: number, p: Player) => sum + (p.soldAmount || 0), 0);
    
    return {
      total: players.length,
      sold: sold.length,
      unsold: unsold.length,
      available: available.length,
      totalSpent
    };
  }, [players]);

  const handleDeletePlayer = useCallback(async (player: Player) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/players/${player._id}/remove-from-team`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      clearCache();
      setPlayerToDelete(null);
      setSelectedTeam(null);
      const data = await resultsService.getResultsData(false);
      setTeams(data.teams);
      setPlayers(data.players);
    } catch (error: any) {
      console.error('Error removing player from team:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to remove player from team';
      toast.error(`Failed to remove player: ${errorMessage}`);
    }
  }, [API_URL]);

  const handleChangeTeam = useCallback(async () => {
    if (!playerToChangeTeam || !newTeamId) {
      toast.warning('Please select a team');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/players/${playerToChangeTeam._id}`, {
        team: newTeamId,
        status: 'sold',
        soldAmount: playerToChangeTeam.soldAmount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      clearCache();
      setPlayerToChangeTeam(null);
      setNewTeamId('');
      setSelectedTeam(null);
      const data = await resultsService.getResultsData(false);
      setTeams(data.teams);
      setPlayers(data.players);
    } catch (error: any) {
      console.error('Error changing player team:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to change player team';
      toast.error(errorMessage);
    }
  }, [playerToChangeTeam, newTeamId, API_URL]);

  const fetchData = useCallback(async (useCache = true) => {
    try {
      const data = await resultsService.getResultsData(useCache);
      setTeams(data.teams);
      setPlayers(data.players);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      await fetchData(true); // Use cache
      setLoading(false);
    };
    loadData();
    
    // Setup Socket.io for real-time updates
    const socket = initializeSocket();

    socket.on('connect', () => {});

    socket.on('playerSold', (data: any) => {
      // Update in-place: move player to sold and update team
      const soldPlayer = data?.player || data;
      if (soldPlayer?._id) {
        setPlayers(prev => prev.map(p => p._id === soldPlayer._id ? { ...p, ...soldPlayer } : p));
      }
      const team = data?.team;
      if (team?._id) {
        setTeams(prev => prev.map(t => t._id === team._id ? { ...t, ...team } : t));
      }
    });
    socket.on('playerMarkedUnsold', (player: any) => {
      if (player?._id) {
        setPlayers(prev => prev.map(p => p._id === player._id ? { ...p, ...player } : p));
      }
    });
    socket.on('dataReset', () => {
      clearCache();
      fetchData(false);
    });
    socket.on('playerUpdated', (updatedPlayer: any) => {
      setPlayers(prevPlayers => prevPlayers.map(p => 
        p._id === updatedPlayer._id ? updatedPlayer : p
      ));
    });
    socket.on('teamUpdated', (updatedTeam: any) => {
      setTeams(prevTeams => prevTeams.map(t => 
        t._id === updatedTeam._id ? updatedTeam : t
      ));
    });
    socket.on('playerRemovedFromTeam', (data: { player: any; team: any }) => {
      if (data.team) {
        setTeams(prevTeams => prevTeams.map(t => 
          t._id === data.team._id ? data.team : t
        ));
      }
      if (data.player) {
        setPlayers(prevPlayers => prevPlayers.map(p => 
          p._id === data.player._id ? data.player : p
        ));
      }
    });

    socket.on('disconnect', () => {});
    
    return () => {
      socket.off('connect');
      socket.off('playerSold');
      socket.off('playerMarkedUnsold');
      socket.off('dataReset');
      socket.off('playerUpdated');
      socket.off('teamUpdated');
      socket.off('playerRemovedFromTeam');
      socket.off('disconnect');
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

  // Memoized handlers for better performance
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

  // CSV Export
  const exportCSV = useCallback(() => {
    const rows: string[][] = [];
    const sorted = [...teamsWithPlayers].sort((a, b) => b.actualSpent - a.actualSpent);
    const totalBudgetAll = sorted.reduce((s, t) => s + (t.team.budget || 0), 0);
    const totalSpentAll = sorted.reduce((s, t) => s + t.actualSpent, 0);
    const totalRemainingAll = sorted.reduce((s, t) => s + t.actualRemaining, 0);
    const totalPlayersAll = sorted.reduce((s, t) => s + t.teamPlayers.length, 0);
    const now = new Date();

    // ===== REPORT TITLE =====
    rows.push(['AUCTION RESULTS']);
    rows.push([`Date: ${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, '', `Time: ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`]);
    rows.push([]);

    // ===== SUMMARY =====
    rows.push(['========================================================']);
    rows.push(['SUMMARY']);
    rows.push(['========================================================']);
    rows.push([]);
    rows.push(['Teams', String(sorted.length)]);
    rows.push(['Players Bought', String(totalPlayersAll)]);
    rows.push(['Players Not Sold', String(players.filter(p => p.status === 'unsold').length)]);
    rows.push(['Players Waiting', String(players.filter(p => p.status === 'available').length)]);
    rows.push([]);
    rows.push(['Total Budget', formatCurrency(totalBudgetAll)]);
    rows.push(['Total Spent', formatCurrency(totalSpentAll)]);
    rows.push(['Money Left', formatCurrency(totalRemainingAll)]);
    rows.push([]);
    rows.push([]);

    // ===== TEAM RANKINGS =====
    rows.push(['========================================================']);
    rows.push(['TEAM RANKINGS']);
    rows.push(['========================================================']);
    rows.push([]);
    rows.push(['Rank', 'Team Name', 'Players', 'Budget', 'Spent', 'Left', 'Slots', '% Used']);
    rows.push(['----', '---------', '-------', '------', '-----', '----', '-----', '------']);
    sorted.forEach(({ team, teamPlayers, actualFilledSlots, actualSpent, actualRemaining, budgetUsedPercentage }, i) => {
      rows.push([
        String(i + 1),
        team.name,
        String(teamPlayers.length),
        formatCurrency(team.budget || 0),
        formatCurrency(actualSpent),
        formatCurrency(actualRemaining),
        `${actualFilledSlots} of ${team.totalSlots}`,
        `${budgetUsedPercentage}%`,
      ]);
    });
    rows.push([]);
    rows.push([]);

    // ===== TEAM WISE PLAYER DETAILS =====
    rows.push(['========================================================']);
    rows.push(['TEAM WISE PLAYER DETAILS']);
    rows.push(['========================================================']);

    sorted.forEach(({ team, teamPlayers, actualFilledSlots, actualSpent, actualRemaining, budgetUsedPercentage }, i) => {
      rows.push([]);
      rows.push(['--------------------------------------------------------']);
      rows.push([`${i + 1}. ${team.name}`]);
      rows.push(['--------------------------------------------------------']);
      rows.push(['Budget', formatCurrency(team.budget || 0), '', 'Spent', formatCurrency(actualSpent)]);
      rows.push(['Left', formatCurrency(actualRemaining), '', 'Slots', `${actualFilledSlots} of ${team.totalSlots}`]);
      rows.push(['% Used', `${budgetUsedPercentage}%`]);
      rows.push([]);

      if (teamPlayers.length === 0) {
        rows.push(['', 'No players bought yet']);
      } else {
        const enabledFieldsForCSV = enabledFields.slice(0, 4);
        const playerHeader = ['No.', 'Player Name'];
        enabledFieldsForCSV.forEach(f => playerHeader.push(f.fieldLabel));
        playerHeader.push('Price');
        rows.push(playerHeader);

        const dividerRow = playerHeader.map(() => '----');
        rows.push(dividerRow);

        const sortedPlayers = [...teamPlayers].sort((a, b) => (b.soldAmount || 0) - (a.soldAmount || 0));
        sortedPlayers.forEach((p, j) => {
          const playerRow = [String(j + 1), p.name];
          const pAny = p as any;
          enabledFieldsForCSV.forEach(f => {
            const val = pAny[f.fieldName] || (pAny.customFields && pAny.customFields[f.fieldName]) || '';
            playerRow.push(String(val));
          });
          playerRow.push(formatCurrency(p.soldAmount || 0));
          rows.push(playerRow);
        });

        rows.push([]);
        rows.push(['', '', ...enabledFieldsForCSV.map(() => ''), `Total: ${formatCurrency(actualSpent)}`]);
      }
      rows.push([]);
    });

    rows.push([]);
    rows.push([]);

    // ===== UNSOLD PLAYERS =====
    const unsold = players.filter(p => p.status === 'unsold');
    if (unsold.length > 0) {
      rows.push(['========================================================']);
      rows.push(['PLAYERS NOT SOLD']);
      rows.push(['========================================================']);
      rows.push([]);
      const enabledFieldsForCSV = enabledFields.slice(0, 4);
      const unsoldHeader = ['No.', 'Player Name'];
      enabledFieldsForCSV.forEach(f => unsoldHeader.push(f.fieldLabel));
      rows.push(unsoldHeader);
      rows.push(unsoldHeader.map(() => '----'));
      unsold.forEach((p, i) => {
        const row = [String(i + 1), p.name];
        const pAny = p as any;
        enabledFieldsForCSV.forEach(f => {
          const val = pAny[f.fieldName] || (pAny.customFields && pAny.customFields[f.fieldName]) || '';
          row.push(String(val));
        });
        rows.push(row);
      });
      rows.push([]);
      rows.push([]);
    }

    // ===== FOOTER =====
    rows.push(['========================================================']);
    rows.push(['End of Report']);
    rows.push(['========================================================']);

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `auction-results-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [teamsWithPlayers, players, enabledFields]);

  // Top 3 highest-sold players
  const top3Players = useMemo(() => {
    const teamMap = new Map(teams.map(t => [t._id, t]));
    return players
      .filter(p => p.status === 'sold' && (p.soldAmount || 0) > 0)
      .sort((a, b) => (b.soldAmount || 0) - (a.soldAmount || 0))
      .slice(0, 3)
      .map(p => ({
        ...p,
        teamName: teamMap.get(p.team as string)?.name || '',
        teamLogo: teamMap.get(p.team as string)?.logoUrl || '',
      }));
  }, [players, teams]);

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
              {top3Players.length > 0 && (
                <button
                  onClick={() => setShowTop3Modal(true)}
                  className="mvp-btn group"
                >
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/><path d="M19 19H5v-2h14v2z"/></svg>
                  <span>MVP</span>
                </button>
              )}
              {!loading && teams.length > 0 && (
                <button
                  onClick={exportCSV}
                  className="group ml-2 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-semibold transition-all duration-200"
                  style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    color: '#a5b4fc',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    backdropFilter: 'blur(8px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.45)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.25)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  title="Export results as CSV"
                >
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  CSV
                </button>
              )}
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
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(59, 130, 246, 0.1) 100%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: '0 2px 10px rgba(59, 130, 246, 0.2)'
                }}>
                  <div>
                    <p className="text-[8px] sm:text-[9px] text-blue-400/80 uppercase tracking-wider">Available</p>
                    <p className="text-xs sm:text-sm font-black text-blue-400 leading-none">{stats.available}</p>
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
                      {formatCurrency(stats.totalSpent)}
                    </p>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>


      {/* Horizontal Scrolling Teams - Premium Compact Layout */}
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
          {/* Empty State */}
          {teamsWithPlayers.length === 0 && stats.sold === 0 && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center max-w-md">
                {/* Premium Icon */}
                <div className="relative w-28 h-28 mx-auto mb-7">
                  <div className="absolute inset-0 rounded-2xl" style={{
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.03) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.18)',
                    boxShadow: '0 0 40px rgba(212, 175, 55, 0.06)'
                  }}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-14 h-14" viewBox="0 0 48 48" fill="none">
                      <path d="M15 12H10L13 24H10L16 38H32L38 24H35L37 12H33" stroke="rgba(212, 175, 55, 0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      <rect x="15" y="8" width="18" height="4" rx="2" stroke="rgba(212, 175, 55, 0.45)" strokeWidth="1.5" fill="rgba(212, 175, 55, 0.08)"/>
                      <circle cx="24" cy="23" r="5" stroke="rgba(212, 175, 55, 0.4)" strokeWidth="1.5" fill="rgba(212, 175, 55, 0.06)"/>
                      <path d="M24 21V25M22 23H26" stroke="rgba(212, 175, 55, 0.35)" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-1.5" style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #D4AF37 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>Auction hasn't started yet</h3>
                <p className="text-sm text-gray-500">Results will appear here once players are sold to teams</p>
              </div>
            </div>
          )}

          {/* Vertical Teams Grid - Optimized with memoized components */}
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
                onClick={() => setSelectedTeam(team)}
                getPositionColor={getPositionColor}
                getPositionIcon={getPositionIcon}
                enabledFields={enabledFields}
              />
            ))}
          </div>
        </div>
      )}

      {/* Team Details Modal - Cinematic Premium */}
      {selectedTeam && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(0, 0, 0, 0.95)', backdropFilter: 'blur(16px)' }}
          onClick={() => setSelectedTeam(null)}
        >
          <div 
            className="relative w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[92vh] overflow-hidden sm:rounded-3xl flex flex-col"
            style={{
              background: '#080808',
              border: 'none',
              boxShadow: '0 0 120px rgba(0, 0, 0, 0.9), 0 0 60px rgba(212, 175, 55, 0.08)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ===== HERO SECTION ===== */}
            <div className="relative flex-shrink-0" style={{ minHeight: '220px' }}>
              {/* Background — team logo as blurred backdrop */}
              <div className="absolute inset-0 overflow-hidden">
                {selectedTeam.logoUrl ? (
                  <img src={selectedTeam.logoUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.07] scale-150 blur-2xl" />
                ) : (
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0f1923 0%, #0a0a0a 40%, #1a0f0a 100%)' }} />
                )}
                {/* Gradient overlays */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(212,175,55,0.06) 0%, transparent 40%)' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, #080808 0%, rgba(8,8,8,0.8) 50%, rgba(8,8,8,0.4) 100%)' }} />
              </div>

              {/* Close button */}
              <button
                onClick={() => setSelectedTeam(null)}
                className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 hover:rotate-90"
                style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Hero Content */}
              <div className="relative z-10 px-6 sm:px-8 pt-6 sm:pt-8 pb-6">
                <div className="flex items-center gap-5 sm:gap-6">
                  {/* Team Logo — large & cinematic */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0"
                    style={{
                      background: 'linear-gradient(145deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.03) 100%)',
                      border: '2px solid rgba(212,175,55,0.2)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 30px rgba(212,175,55,0.08)'
                    }}
                  >
                    {selectedTeam.logoUrl ? (
                      <img src={selectedTeam.logoUrl} alt={selectedTeam.name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl sm:text-5xl font-extralight" style={{ color: 'rgba(212,175,55,0.6)' }}>
                        {selectedTeam.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight truncate">
                      {selectedTeam.name}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-white/30 font-medium tracking-[0.2em] uppercase mt-1">Squad Overview</p>
                  </div>
                </div>

                {/* Stats Row — glassmorphic pills */}
                <div className="flex flex-wrap gap-2 sm:gap-3 mt-5 sm:mt-6">
                  {(() => {
                    const teamPlayers = selectedTeam.players && selectedTeam.players.length > 0
                      ? selectedTeam.players
                      : players.filter(p => {
                          if (!p.team || p.status !== 'sold') return false;
                          const playerTeamId = typeof p.team === 'object' ? (p.team as any)._id : p.team;
                          return String(playerTeamId) === String(selectedTeam._id);
                        });
                    const spent = teamPlayers.reduce((sum, p) => sum + (p.soldAmount || 0), 0);
                    const actualRemaining = selectedTeam.remainingBudget !== undefined && selectedTeam.remainingBudget !== null 
                      ? selectedTeam.remainingBudget 
                      : (selectedTeam.budget || 0) - spent;
                    const actualSpent = (selectedTeam.budget || 0) - actualRemaining;
                    const budgetPercent = ((actualSpent / (selectedTeam.budget || 1)) * 100);
                    
                    return (
                      <>
                        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)' }}
                        >
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#D4AF37', boxShadow: '0 0 6px rgba(212,175,55,0.4)' }} />
                          <span className="text-[10px] sm:text-[11px] text-white/40 uppercase tracking-wider">Budget</span>
                          <span className="text-sm sm:text-base font-semibold text-white ml-1">{formatCurrency(selectedTeam.budget || 0)}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl"
                          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)', backdropFilter: 'blur(8px)' }}
                        >
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.4)' }} />
                          <span className="text-[10px] sm:text-[11px] text-white/40 uppercase tracking-wider">Spent</span>
                          <span className="text-sm sm:text-base font-semibold text-emerald-400 ml-1">{formatCurrency(actualSpent)}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl"
                          style={{ background: actualRemaining < (selectedTeam.budget || 0) * 0.2 ? 'rgba(239,68,68,0.06)' : 'rgba(59,130,246,0.06)', border: `1px solid ${actualRemaining < (selectedTeam.budget || 0) * 0.2 ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)'}`, backdropFilter: 'blur(8px)' }}
                        >
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: actualRemaining < (selectedTeam.budget || 0) * 0.2 ? '#ef4444' : '#3b82f6', boxShadow: `0 0 6px ${actualRemaining < (selectedTeam.budget || 0) * 0.2 ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.4)'}` }} />
                          <span className="text-[10px] sm:text-[11px] text-white/40 uppercase tracking-wider">Left</span>
                          <span className={`text-sm sm:text-base font-semibold ml-1 ${actualRemaining < (selectedTeam.budget || 0) * 0.2 ? 'text-red-400' : 'text-blue-400'}`}>{formatCurrency(actualRemaining)}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl"
                          style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.12)', backdropFilter: 'blur(8px)' }}
                        >
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#a855f7', boxShadow: '0 0 6px rgba(168,85,247,0.4)' }} />
                          <span className="text-[10px] sm:text-[11px] text-white/40 uppercase tracking-wider">Squad</span>
                          <span className="text-sm sm:text-base font-semibold text-purple-400 ml-1">{selectedTeam.filledSlots || teamPlayers.length}<span className="text-white/20">/{selectedTeam.totalSlots}</span></span>
                        </div>

                        {/* Slim progress bar */}
                        <div className="w-full mt-1">
                          <div className="relative h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
                              style={{
                                width: `${Math.min(budgetPercent, 100)}%`,
                                background: budgetPercent > 80 
                                  ? 'linear-gradient(90deg, #ef4444, #dc2626)' 
                                  : budgetPercent > 50 
                                  ? 'linear-gradient(90deg, #D4AF37, #F0D770)' 
                                  : 'linear-gradient(90deg, #10b981, #34d399)',
                                boxShadow: `0 0 12px ${budgetPercent > 80 ? 'rgba(239,68,68,0.4)' : budgetPercent > 50 ? 'rgba(212,175,55,0.4)' : 'rgba(16,185,129,0.4)'}`
                              }}
                            />
                          </div>
                          <div className="flex justify-between mt-1.5">
                            <span className="text-[9px] text-white/20 tracking-wider">{budgetPercent.toFixed(0)}% UTILIZED</span>
                            <span className="text-[9px] text-white/20 tracking-wider">{(100 - budgetPercent).toFixed(0)}% AVAILABLE</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Bottom edge line */}
              <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
            </div>

            {/* ===== PLAYERS SECTION ===== */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="px-6 sm:px-8 py-5 sm:py-6">
              {(() => {
                const teamPlayers = selectedTeam.players && selectedTeam.players.length > 0
                  ? selectedTeam.players
                  : players.filter(p => {
                      if (!p.team || p.status !== 'sold') return false;
                      const playerTeamId = typeof p.team === 'object' ? (p.team as any)._id : p.team;
                      return String(playerTeamId) === String(selectedTeam._id);
                    });
                
                if (teamPlayers.length === 0) {
                  return (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <div className="relative w-20 h-20 mx-auto mb-5">
                          <div className="absolute inset-0 rounded-2xl" style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.06)'
                          }}></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-10 h-10" viewBox="0 0 48 48" fill="none">
                              <circle cx="18" cy="16" r="6" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none"/>
                              <circle cx="32" cy="16" r="6" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" fill="none"/>
                              <path d="M8 38c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                              <path d="M26 38c0-5.523 4.477-10 10-10" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                            </svg>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-white/25">No Players Yet</p>
                        <p className="text-xs text-white/12 mt-1">This team hasn't acquired any players</p>
                      </div>
                    </div>
                  );
                }

                // Sort by soldAmount descending (most expensive first)
                const sortedPlayers = [...teamPlayers].sort((a, b) => (b.soldAmount || 0) - (a.soldAmount || 0));
                const topPrice = sortedPlayers[0]?.soldAmount || 1;

                return (
                  <>
                    {/* Section label */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 rounded-full" style={{ background: '#D4AF37' }} />
                        <span className="text-[11px] text-white/30 font-semibold uppercase tracking-[0.2em]">Players</span>
                      </div>
                      <span className="text-[11px] text-white/20">{teamPlayers.length} acquired</span>
                    </div>

                    {/* Player list — ranked list style */}
                    <div className="space-y-2">
                      {sortedPlayers.map((player, index) => {
                        const priceRatio = (player.soldAmount || 0) / topPrice;
                        const isMVP = index === 0 && teamPlayers.length > 1;
                        
                        return (
                          <div key={player._id}
                            className="group relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.01]"
                            style={{
                              background: isMVP 
                                ? 'linear-gradient(135deg, rgba(212,175,55,0.06) 0%, rgba(20,20,20,0.8) 40%, rgba(15,15,15,0.9) 100%)'
                                : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${isMVP ? 'rgba(212,175,55,0.15)' : 'rgba(255,255,255,0.04)'}`,
                            }}
                          >
                            {/* Price bar — visual indicator */}
                            <div className="absolute bottom-0 left-0 h-[2px] rounded-full transition-all duration-700"
                              style={{
                                width: `${priceRatio * 100}%`,
                                background: isMVP 
                                  ? 'linear-gradient(90deg, #D4AF37, #F0D770)' 
                                  : `linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,${0.04 + priceRatio * 0.12}))`,
                                boxShadow: isMVP ? '0 0 10px rgba(212,175,55,0.3)' : 'none'
                              }}
                            />

                            <div className="relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
                              {/* Rank */}
                              <div className="flex-shrink-0 w-7 text-center">
                                {isMVP ? (
                                  <span className="text-sm" style={{ color: '#D4AF37' }}>★</span>
                                ) : (
                                  <span className="text-sm font-medium text-white/15">{index + 1}</span>
                                )}
                              </div>

                              {/* Player Photo */}
                              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden flex-shrink-0"
                                style={{
                                  background: isMVP 
                                    ? 'linear-gradient(145deg, #1a1a2e, #16213e)' 
                                    : 'linear-gradient(145deg, #141414, #1a1a1a)',
                                  boxShadow: isMVP ? '0 4px 20px rgba(0,0,0,0.5), 0 0 15px rgba(212,175,55,0.08)' : '0 4px 12px rgba(0,0,0,0.3)',
                                  border: `1px solid ${isMVP ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)'}`
                                }}
                              >
                                {player.photoUrl ? (
                                  <img src={player.photoUrl} alt={player.name} loading="lazy" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="text-lg font-extralight text-white/20">
                                      {player.name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Player Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className={`text-sm sm:text-[15px] font-semibold truncate ${isMVP ? 'text-amber-50' : 'text-white/80'}`}>
                                    {player.name}
                                  </h3>
                                  {isMVP && (
                                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                                      style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}
                                    >
                                      MVP
                                    </span>
                                  )}
                                </div>
                                {(() => {
                                  const highPriorityField = enabledFields.find(f => f.isHighPriority);
                                  const p = player as any;
                                  let displayValue = '';
                                  if (highPriorityField) {
                                    const val = p[highPriorityField.fieldName] || (p.customFields && p.customFields[highPriorityField.fieldName]);
                                    if (val) displayValue = String(val);
                                  }
                                  if (!displayValue && enabledFields.length > 0) {
                                    for (const field of enabledFields) {
                                      const val = p[field.fieldName] || (p.customFields && p.customFields[field.fieldName]);
                                      if (val) { displayValue = String(val); break; }
                                    }
                                  }
                                  return displayValue ? (
                                    <p className="text-[11px] text-white/25 mt-0.5 truncate">{displayValue}</p>
                                  ) : null;
                                })()}
                              </div>

                              {/* Price */}
                              <div className="flex-shrink-0 text-right">
                                <span className={`text-sm sm:text-base font-bold tracking-tight ${isMVP ? '' : 'text-white/60'}`}
                                  style={isMVP ? { color: '#D4AF37' } : {}}
                                >
                                  {formatCurrency(player.soldAmount || 0)}
                                </span>
                              </div>

                              {/* Actions */}
                              {isAuctioneer && (
                                <div className="flex-shrink-0 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 ml-1">
                                  <button
                                    onClick={() => handleSetPlayerToChangeTeam(player)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                                    style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)' }}
                                    title="Change Team"
                                  >
                                    <svg className="w-3.5 h-3.5 text-blue-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleSetPlayerToDelete(player)}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.15)' }}
                                    title="Remove from Team"
                                  >
                                    <svg className="w-3.5 h-3.5 text-red-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Team Modal */}
      {playerToChangeTeam && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => {
            setPlayerToChangeTeam(null);
            setNewTeamId('');
          }}
        >
          <div 
            className="relative w-full max-w-2xl overflow-hidden rounded-xl sm:rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(10, 20, 30, 0.9) 50%, rgba(0, 0, 0, 0.95) 100%)',
              border: '2px solid rgba(59, 130, 246, 0.4)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 100px rgba(59, 130, 246, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b" style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(0, 0, 0, 0.8) 100%)',
              borderBottom: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 sm:gap-3" style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #93c5fd 50%, #3b82f6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Change Player Team
              </h2>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6">
              <div className="bg-slate-900/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-500/30 mb-4 sm:mb-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl sm:text-2xl font-black text-white">
                    {playerToChangeTeam.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">{playerToChangeTeam.name}</h3>
                    {playerToChangeTeam.class && (
                      <p className="text-[10px] sm:text-xs text-gray-400">
                        {playerToChangeTeam.class}
                      </p>
                    )}
                    <p className="text-[10px] sm:text-xs text-blue-400 font-bold">{playerToChangeTeam.position} • {formatCurrency(playerToChangeTeam.soldAmount!)}</p>
                  </div>
                </div>
              </div>

              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-bold text-gray-300 mb-2 sm:mb-3">
                  Select New Team
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 max-h-64 sm:max-h-96 overflow-y-auto custom-scrollbar">
                  {teams
                    .filter(team => {
                      // Filter out current team
                      const currentTeamId = typeof playerToChangeTeam.team === 'object' 
                        ? (playerToChangeTeam.team as any)._id 
                        : playerToChangeTeam.team;
                      return team._id !== currentTeamId;
                    })
                    .map((team) => {
                      const isSelected = newTeamId === team._id;
                      const canAfford = (team.remainingBudget || 0) >= (playerToChangeTeam.soldAmount || 0);
                      const hasSlots = (team.filledSlots || 0) < (team.totalSlots || 0);
                      const isAvailable = canAfford && hasSlots;
                      
                      return (
                        <button
                          key={team._id}
                          onClick={() => isAvailable && setNewTeamId(team._id)}
                          disabled={!isAvailable}
                          className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 transition-all duration-300 text-left ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-500/20 scale-105' 
                              : isAvailable
                                ? 'border-gray-600 hover:border-blue-400 hover:bg-blue-500/10'
                                : 'border-gray-800 bg-gray-900/30 opacity-50 cursor-not-allowed'
                          }`}
                          style={{
                            background: isSelected 
                              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(30, 64, 175, 0.1) 100%)'
                              : isAvailable
                                ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.5) 0%, rgba(10, 10, 10, 0.4) 100%)'
                                : 'rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                            <h3 className={`font-black text-base sm:text-lg ${
                              isSelected ? 'text-blue-400' : isAvailable ? 'text-white' : 'text-gray-600'
                            }`}>
                              {team.name}
                            </h3>
                            {isSelected && (
                              <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Budget Left:</span>
                              <span className={`font-bold ${
                                canAfford ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {formatCurrency(team.remainingBudget || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Slots:</span>
                              <span className={`font-bold ${
                                hasSlots ? 'text-blue-400' : 'text-red-400'
                              }`}>
                                {team.filledSlots || 0}/{team.totalSlots}
                              </span>
                            </div>
                            {!isAvailable && (
                              <p className="text-xs text-red-400 mt-2 font-semibold">
                                {!canAfford && 'Insufficient budget'}
                                {!canAfford && !hasSlots && ' • '}
                                {!hasSlots && 'No slots available'}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-gray-300">
                <p className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    Player will be moved to the selected team. The sold amount ({formatCurrency(playerToChangeTeam.soldAmount!)}) will be deducted from new team's budget and refunded to current team.
                  </span>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-900/50 border-t border-blue-500/30 flex gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setPlayerToChangeTeam(null);
                  setNewTeamId('');
                }}
                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700 hover:bg-gray-600 rounded-lg sm:rounded-xl font-bold text-white text-sm sm:text-base transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeTeam}
                disabled={!newTeamId}
                className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold text-white text-sm sm:text-base transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                  newTeamId
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600'
                    : 'bg-gray-700 opacity-50 cursor-not-allowed'
                }`}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Change Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {playerToDelete && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setPlayerToDelete(null)}
        >
          <div 
            className="relative w-full max-w-md overflow-hidden rounded-xl sm:rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 10, 10, 0.9) 50%, rgba(0, 0, 0, 0.95) 100%)',
              border: '2px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 100px rgba(239, 68, 68, 0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b" style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(0, 0, 0, 0.8) 100%)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 sm:gap-3" style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #fca5a5 50%, #ef4444 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Remove Player?
              </h2>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-6">
              <div className="bg-slate-900/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-red-500/30 mb-4 sm:mb-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-xl sm:text-2xl font-black text-white">
                    {playerToDelete.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white">{playerToDelete.name}</h3>
                    {playerToDelete.class && (
                      <p className="text-[10px] sm:text-xs text-gray-400">
                        {playerToDelete.class}
                      </p>
                    )}
                    <p className="text-[10px] sm:text-xs text-red-400 font-bold">{playerToDelete.position} • {formatCurrency(playerToDelete.soldAmount!)}</p>
                  </div>
                </div>
              </div>

              <p className="text-gray-300 text-xs sm:text-sm mb-2">
                Are you sure you want to remove <span className="font-bold text-white">{playerToDelete.name}</span> from the team?
              </p>
              <p className="text-gray-400 text-[10px] sm:text-xs">
                • Player will be marked as <span className="text-amber-400">available</span> again<br/>
                • Amount <span className="text-emerald-400">{formatCurrency(playerToDelete.soldAmount!)}</span> will be refunded to team's budget
              </p>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-900/50 border-t border-red-500/30 flex gap-2 sm:gap-3">
              <button
                onClick={() => setPlayerToDelete(null)}
                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gray-700 hover:bg-gray-600 rounded-lg sm:rounded-xl font-bold text-white text-sm sm:text-base transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeletePlayer(playerToDelete)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TOP 3 MVP MODAL ═══ */}
      {showTop3Modal && (
        <div className="mvp-overlay" onClick={() => setShowTop3Modal(false)}>
          <div className="mvp-modal" onClick={(e) => e.stopPropagation()}>
            {/* Background FX */}
            <div className="mvp-bg-radial" />
            <div className="mvp-bg-streak" />
            <div className="mvp-particles">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="mvp-particle" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${5 + Math.random() * 6}s` }} />
              ))}
            </div>

            {/* Close */}
            <button className="mvp-close" onClick={() => setShowTop3Modal(false)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* Header */}
            <div className="mvp-header">
              <div className="mvp-crown">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/><path d="M19 19H5v-2h14v2z"/></svg>
              </div>
              <h2 className="mvp-title">MOST VALUABLE PLAYERS</h2>
              <div className="mvp-title-sep" />
              <p className="mvp-subtitle">The highest-valued acquisitions of the auction</p>
            </div>

            {/* Cards — podium order: #2, #1, #3 */}
            <div className="mvp-podium">
              {[1, 0, 2].map((orderIdx) => {
                const p = top3Players[orderIdx];
                if (!p) return null;
                const rank = orderIdx + 1;
                const isChampion = rank === 1;
                const medals: Record<number, { bg: string; border: string; text: string; glow: string; label: string; ring: string }> = {
                  1: { bg: 'rgba(212,175,55,.06)', border: 'rgba(212,175,55,.35)', text: '#c9a84c', glow: 'rgba(212,175,55,.18)', label: '#1', ring: 'linear-gradient(135deg, #c9a84c, #f0d770, #c9a84c)' },
                  2: { bg: 'rgba(192,192,192,.04)', border: 'rgba(192,192,192,.22)', text: '#b8b8b8', glow: 'rgba(192,192,192,.1)', label: '#2', ring: 'linear-gradient(135deg, #b0b0b0, #d8d8d8, #b0b0b0)' },
                  3: { bg: 'rgba(205,127,50,.04)', border: 'rgba(205,127,50,.22)', text: '#cd7f32', glow: 'rgba(205,127,50,.1)', label: '#3', ring: 'linear-gradient(135deg, #cd7f32, #e8a854, #cd7f32)' },
                };
                const m = medals[rank];
                return (
                  <div
                    key={p._id}
                    className={`mvp-card ${isChampion ? 'mvp-champion' : ''}`}
                    style={{
                      '--mvp-border': m.border,
                      '--mvp-bg': m.bg,
                      '--mvp-glow': m.glow,
                      '--mvp-accent': m.text,
                      '--mvp-ring': m.ring,
                      order: rank === 1 ? 1 : rank === 2 ? 0 : 2,
                    } as React.CSSProperties}
                  >
                    <div className="mvp-card-shimmer" />
                    <div className="mvp-card-border-glow" />

                    {/* Rank */}
                    <div className="mvp-rank" style={{ color: m.text, borderColor: m.border, background: m.bg }}>{m.label}</div>

                    {/* Photo with decorative ring */}
                    <div className="mvp-photo-ring" style={{ background: m.ring }}>
                      <div className="mvp-photo-inner">
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt={p.name} className="mvp-photo" />
                        ) : (
                          <div className="mvp-photo-fallback" style={{ color: m.text }}>{p.name.charAt(0)}</div>
                        )}
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className="mvp-name">{p.name}</h3>

                    {/* Position */}
                    {p.position && (
                      <div className="mvp-position" style={{ color: m.text, borderColor: m.border }}>{p.position.toUpperCase()}</div>
                    )}

                    {/* Sold amount — hero */}
                    <div className="mvp-amount" style={{ color: m.text }}>
                      <span className="mvp-rupee">₹</span>{(p.soldAmount || 0).toLocaleString('en-IN')}
                    </div>

                    {/* Valuation label */}
                    <div className="mvp-val-label">VALUATION</div>

                    {/* Team */}
                    <div className="mvp-team-row">
                      {p.teamLogo ? (
                        <img src={p.teamLogo} alt={p.teamName} className="mvp-team-logo" />
                      ) : (
                        <div className="mvp-team-initial" style={{ color: m.text, borderColor: m.border }}>{p.teamName.charAt(0)}</div>
                      )}
                      <span className="mvp-team-name">{p.teamName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Premium Scrollbar Styles */}
      <style>{`
        /* ═══ MVP BUTTON ═══ */
        .mvp-btn {
          display: flex; align-items: center; gap: 4px;
          padding: 4px 10px;
          border-radius: 9999px;
          border: 1px solid rgba(201,168,76,.35);
          background: rgba(201,168,76,.08);
          color: #c9a84c;
          font-family: 'Georgia', serif;
          font-size: 10px;
          letter-spacing: 2px;
          cursor: pointer;
          transition: all .25s;
        }
        .mvp-btn:hover {
          background: rgba(201,168,76,.15);
          border-color: rgba(201,168,76,.55);
          box-shadow: 0 0 18px rgba(201,168,76,.15);
          transform: translateY(-1px);
        }

        /* ═══ MVP OVERLAY ═══ */
        .mvp-overlay {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,.92);
          backdrop-filter: blur(12px);
          animation: mvpFadeIn .3s ease-out;
        }
        @keyframes mvpFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .mvp-modal {
          position: relative;
          width: 95%; max-width: 880px;
          max-height: 92vh;
          overflow-y: auto;
          padding: 40px 24px 32px;
          border-radius: 20px;
          border: 1px solid rgba(201,168,76,.15);
          background: #060504;
          box-shadow: 0 0 80px rgba(0,0,0,.6), 0 0 40px rgba(201,168,76,.06);
          animation: mvpSlideUp .4s ease-out;
        }
        @keyframes mvpSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* BG FX */
        .mvp-bg-radial {
          position: absolute; inset: 0; border-radius: 20px;
          background: radial-gradient(ellipse 60% 50% at 50% 25%, rgba(201,168,76,.07) 0%, transparent 70%);
          pointer-events: none;
        }
        .mvp-bg-streak {
          position: absolute; top: 48%; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,.2), transparent);
          pointer-events: none;
        }
        .mvp-particles { position: absolute; inset: 0; overflow: hidden; pointer-events: none; border-radius: 20px; }
        .mvp-particle {
          position: absolute; bottom: -2px;
          width: 2px; height: 2px;
          background: rgba(201,168,76,.5);
          border-radius: 50%;
          animation: mvpFloat linear infinite;
        }
        @keyframes mvpFloat {
          0%   { transform: translateY(0); opacity: 0; }
          10%  { opacity: .6; }
          90%  { opacity: .15; }
          100% { transform: translateY(-70vh); opacity: 0; }
        }

        /* Close */
        .mvp-close {
          position: absolute; top: 14px; right: 14px; z-index: 5;
          width: 32px; height: 32px; border-radius: 50%;
          border: 1px solid rgba(201,168,76,.15);
          background: rgba(201,168,76,.04);
          color: rgba(201,168,76,.5);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all .25s;
        }
        .mvp-close:hover {
          border-color: rgba(201,168,76,.4); color: #c9a84c;
          transform: rotate(90deg);
        }

        /* Header */
        .mvp-header {
          position: relative; z-index: 1;
          text-align: center;
          margin-bottom: 32px;
        }
        .mvp-crown {
          display: inline-flex; align-items: center; justify-content: center;
          width: 48px; height: 48px; border-radius: 50%;
          border: 1.5px solid rgba(201,168,76,.3);
          background: rgba(201,168,76,.06);
          color: #c9a84c;
          margin-bottom: 14px;
          box-shadow: 0 0 30px rgba(201,168,76,.1);
          animation: mvpCrownPulse 3s ease-in-out infinite;
        }
        @keyframes mvpCrownPulse {
          0%,100% { box-shadow: 0 0 20px rgba(201,168,76,.08); }
          50%     { box-shadow: 0 0 40px rgba(201,168,76,.18); }
        }
        .mvp-title {
          font-family: 'Georgia', serif;
          font-size: 18px; letter-spacing: 6px;
          color: #c9a84c; margin: 0;
        }
        .mvp-title-sep {
          width: 60px; height: 1px; margin: 10px auto;
          background: linear-gradient(90deg, transparent, rgba(201,168,76,.4), transparent);
        }
        .mvp-subtitle {
          font-family: 'Georgia', serif;
          font-size: 11px; color: rgba(255,255,255,.3);
          letter-spacing: 1px; margin: 0;
        }

        /* ═══ PODIUM ═══ */
        .mvp-podium {
          position: relative; z-index: 1;
          display: flex; justify-content: center; align-items: flex-end;
          gap: 20px;
        }

        /* ═══ CARD ═══ */
        .mvp-card {
          position: relative;
          display: flex; flex-direction: column; align-items: center;
          width: 220px;
          padding: 28px 18px 20px;
          border-radius: 16px;
          border: 1px solid var(--mvp-border);
          background: var(--mvp-bg);
          overflow: hidden;
          transition: transform .35s, box-shadow .35s;
        }
        .mvp-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 40px var(--mvp-glow);
        }
        .mvp-champion {
          width: 260px;
          padding: 36px 22px 24px;
          border-width: 1.5px;
        }

        .mvp-card-shimmer {
          position: absolute; inset: 0;
          background: linear-gradient(105deg, transparent 38%, rgba(201,168,76,.04) 46%, rgba(201,168,76,.08) 50%, rgba(201,168,76,.04) 54%, transparent 62%);
          background-size: 260% 100%;
          animation: mvpShimmer 5s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes mvpShimmer {
          0%   { background-position: 160% 0; }
          100% { background-position: -60% 0; }
        }

        .mvp-card-border-glow {
          position: absolute; inset: -1px; border-radius: 17px;
          background: linear-gradient(160deg, var(--mvp-glow), transparent 35%, transparent 65%, var(--mvp-glow));
          pointer-events: none; z-index: 0;
        }

        /* Rank */
        .mvp-rank {
          position: absolute; top: 10px; right: 12px;
          font-family: 'Georgia', serif;
          font-size: 12px; letter-spacing: 1px;
          padding: 3px 10px; border-radius: 6px;
          border: 1px solid; z-index: 2;
        }
        .mvp-champion .mvp-rank {
          font-size: 14px; padding: 4px 12px;
        }

        /* Photo ring */
        .mvp-photo-ring {
          width: 86px; height: 86px;
          border-radius: 50%;
          padding: 3px;
          margin-bottom: 14px;
          flex-shrink: 0;
          position: relative; z-index: 1;
        }
        .mvp-champion .mvp-photo-ring {
          width: 108px; height: 108px;
          padding: 3.5px;
        }
        .mvp-photo-inner {
          width: 100%; height: 100%;
          border-radius: 50%; overflow: hidden;
          background: #0a0806;
        }
        .mvp-photo {
          width: 100%; height: 100%; object-fit: cover;
        }
        .mvp-photo-fallback {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Georgia', serif; font-size: 32px;
        }
        .mvp-champion .mvp-photo-fallback { font-size: 40px; }

        /* Name */
        .mvp-name {
          font-family: 'Georgia', serif;
          font-size: 15px; color: #fff;
          letter-spacing: 1px; text-align: center;
          margin: 0 0 6px;
          max-width: 100%; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis;
          position: relative; z-index: 1;
        }
        .mvp-champion .mvp-name { font-size: 18px; letter-spacing: 1.5px; }

        /* Position */
        .mvp-position {
          font-family: 'Georgia', serif;
          font-size: 8px; letter-spacing: 2.5px;
          padding: 2px 10px; border-radius: 4px;
          border: 1px solid; margin-bottom: 14px;
          position: relative; z-index: 1;
        }

        /* Amount */
        .mvp-amount {
          font-family: 'Georgia', serif;
          font-size: 28px; font-weight: 400;
          letter-spacing: 1px;
          text-shadow: 0 0 20px var(--mvp-glow);
          margin-bottom: 2px;
          position: relative; z-index: 1;
        }
        .mvp-champion .mvp-amount { font-size: 36px; }
        .mvp-rupee { font-size: 20px; margin-right: 3px; opacity: .7; }
        .mvp-champion .mvp-rupee { font-size: 26px; }

        .mvp-val-label {
          font-family: 'Georgia', serif;
          font-size: 8px; letter-spacing: 3px;
          color: rgba(255,255,255,.2);
          margin-bottom: 14px;
          position: relative; z-index: 1;
        }

        /* Team */
        .mvp-team-row {
          display: flex; align-items: center; gap: 7px;
          position: relative; z-index: 1;
        }
        .mvp-team-logo {
          width: 22px; height: 22px; border-radius: 6px; object-fit: cover;
        }
        .mvp-team-initial {
          width: 22px; height: 22px; border-radius: 6px;
          border: 1px solid; background: rgba(0,0,0,.3);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Georgia', serif; font-size: 10px;
        }
        .mvp-team-name {
          font-family: 'Georgia', serif;
          font-size: 12px; color: rgba(255,255,255,.4);
          letter-spacing: .5px;
        }

        /* ═══ RESPONSIVE ═══ */
        @media (max-width: 840px) {
          .mvp-podium {
            flex-direction: column; align-items: center; gap: 16px;
          }
          .mvp-card, .mvp-champion {
            width: 100% !important; max-width: 320px;
            order: unset !important;
          }
          .mvp-champion { padding: 28px 18px 20px; }
          .mvp-photo-ring, .mvp-champion .mvp-photo-ring {
            width: 76px !important; height: 76px !important;
          }
          .mvp-photo-fallback, .mvp-champion .mvp-photo-fallback { font-size: 28px !important; }
          .mvp-amount, .mvp-champion .mvp-amount { font-size: 24px !important; }
          .mvp-rupee, .mvp-champion .mvp-rupee { font-size: 18px !important; }
          .mvp-name, .mvp-champion .mvp-name { font-size: 14px !important; }
          .mvp-title { font-size: 14px; letter-spacing: 4px; }
          .mvp-modal { padding: 32px 16px 24px; }
        }

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

        /* Horizontal scrollbar styling */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.6);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to right, #f59e0b, #d97706);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to right, #fbbf24, #f59e0b);
        }
      `}</style>
    </div>
  );
};

export default ResultsPage;