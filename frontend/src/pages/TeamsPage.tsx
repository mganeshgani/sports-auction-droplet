import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Team } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { teamService, clearCache, getStaleCached } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import ConfirmModal from '../components/ConfirmModal';

const TeamsPage: React.FC = () => {
  const { isAuctioneer, user } = useAuth();
  const [teams, setTeams] = useState<Team[]>(() => getStaleCached('teams:all') || []);
  const [loading, setLoading] = useState(() => !getStaleCached('teams:all'));
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    totalSlots: 11,
    budget: 100000
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  const fetchTeams = useCallback(async (bypassCache = false) => {
    try {
      const data = await teamService.getAllTeams(!bypassCache);
      setTeams(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('totalSlots', formData.totalSlots.toString());
      submitData.append('budget', formData.budget.toString());
      if (logoFile) {
        submitData.append('logo', logoFile);
      }
      
      if (editingTeam) {
        await axios.patch(`${API_URL}/teams/${editingTeam._id}`, submitData, { headers });
      } else {
        await axios.post(`${API_URL}/teams`, submitData, { headers });
      }
      clearCache(); // Clear cache after mutation
      fetchTeams(true); // Bypass cache
      resetForm();
    } catch (error) {
      console.error('Error saving team:', error);
      toast.error('Error saving team. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [formData, logoFile, editingTeam, fetchTeams, API_URL]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/teams/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      clearCache(); // Clear cache after deletion
      fetchTeams(true); // Bypass cache
    } catch (error: any) {
      console.error('Error deleting team:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete team';
      toast.error(errorMessage);
    }
  }, [API_URL, fetchTeams]);

  const resetForm = () => {
    setFormData({ name: '', totalSlots: 11, budget: 100000 });
    setLogoFile(null);
    setLogoPreview('');
    setEditingTeam(null);
    setShowAddModal(false);
  };

  const openEditModal = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      totalSlots: team.totalSlots,
      budget: team.budget || 100000
    });
    setLogoPreview(team.logoUrl || '');
    setLogoFile(null);
    setShowAddModal(true);
  };

  const handleResetAuction = async () => {
    setResetting(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      // Delete all players
      await axios.delete(`${API_URL}/players`, { headers });
      
      // Delete all teams
      await axios.delete(`${API_URL}/teams`, { headers });
      
      // Refresh data
      await fetchTeams();
      setShowResetModal(false);
      
      // Optional: Show success message to user
      toast.success('Auction reset successfully! All teams and players have been deleted.');
    } catch (error: any) {
      console.error('Error resetting auction:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
      toast.error(`Error resetting auction: ${errorMessage}`);
    } finally {
      setResetting(false);
    }
  };

  // Statistics calculations
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Ultra-Compact Premium Header */}
      <div className="flex-shrink-0" style={{
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(13, 17, 23, 0.9) 50%, rgba(0, 0, 0, 0.95) 100%)',
        borderBottom: '1.5px solid rgba(212, 175, 55, 0.3)',
        boxShadow: '0 2px 20px rgba(0, 0, 0, 0.6), 0 0 30px rgba(212, 175, 55, 0.08)',
        padding: '0.375rem 0.5rem'
      }}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          {/* Title & Stats - Combined */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight leading-none" style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F0D770 50%, #D4AF37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 0 30px rgba(212, 175, 55, 0.3)'
              }}>Team Management</h1>
              <p className="text-gray-400 text-[10px] sm:text-xs font-medium tracking-wide mt-0.5">Manage auction teams</p>
            </div>

            {/* Inline Stats - Horizontal scroll on mobile */}
            {!loading && teams.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
                <div className="backdrop-blur-sm rounded-lg px-1.5 sm:px-2 py-1 flex-shrink-0" style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(10, 10, 10, 0.6) 50%, rgba(0, 0, 0, 0.7) 100%)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)'
                }}>
                  <div>
                    <p className="text-[8px] sm:text-[9px] text-gray-400 uppercase tracking-wider">Teams</p>
                    <p className="text-xs sm:text-sm font-black leading-none" style={{ color: '#D4AF37' }}>{teams.length}</p>
                  </div>
                </div>
                <div className="backdrop-blur-sm rounded-lg px-1.5 sm:px-2 py-1 flex-shrink-0" style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(10, 10, 10, 0.6) 50%, rgba(0, 0, 0, 0.7) 100%)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)'
                }}>
                  <div>
                    <p className="text-[8px] sm:text-[9px] text-gray-400 uppercase tracking-wider">Budget</p>
                    <p className="text-xs sm:text-sm font-black leading-none" style={{ color: '#D4AF37' }}>{formatCurrency(teams.reduce((sum, t) => sum + (t.budget || 0), 0))}</p>
                  </div>
                </div>
                <div className="backdrop-blur-sm rounded-lg px-1.5 sm:px-2 py-1 flex-shrink-0" style={{
                  background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(10, 10, 10, 0.6) 50%, rgba(0, 0, 0, 0.7) 100%)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)'
                }}>
                  <div>
                    <p className="text-[8px] sm:text-[9px] text-gray-400 uppercase tracking-wider">Players</p>
                    <p className="text-xs sm:text-sm font-black leading-none" style={{ color: '#D4AF37' }}>{teams.reduce((sum, t) => sum + (t.filledSlots || 0), 0)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Add Team Button - Only for Auctioneers */}
          {isAuctioneer && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => {
              const isLimitReached = user?.limits?.maxTeams && user?.usage?.totalTeams
                ? user.usage.totalTeams >= user.limits.maxTeams
                : false;
              if (isLimitReached) {
                toast.warning(`Team limit reached! You have ${user?.usage?.totalTeams}/${user?.limits?.maxTeams} teams. Contact your administrator to increase the limit.`);
                return;
              }
              setShowAddModal(true);
            }}
            className="group flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 flex-1 sm:flex-initial"
            style={{
              background: 'rgba(212, 175, 55, 0.12)',
              color: '#fcd34d',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              backdropFilter: 'blur(8px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(212, 175, 55, 0.22)';
              e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.5)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(212, 175, 55, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <svg className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Team</span>
          </button>

          {/* Reset Auction Button */}
          <button
            onClick={() => setShowResetModal(true)}
            className="group flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200 flex-1 sm:flex-initial"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#fca5a5',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              backdropFilter: 'blur(8px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.45)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            title="Reset entire auction (delete all data)"
          >
            <svg className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reset</span>
          </button>
          </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4" style={{
                borderColor: 'transparent',
                borderTopColor: '#D4AF37'
              }}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">🏆</span>
              </div>
            </div>
            <p className="mt-4 text-gray-400 font-medium">Loading teams...</p>
          </div>
        </div>
      ) : teams.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            {/* Premium Icon */}
            <div className="relative w-28 h-28 mx-auto mb-7">
              <div className="absolute inset-0 rounded-2xl" style={{
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.03) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                boxShadow: '0 0 40px rgba(212, 175, 55, 0.08)'
              }}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-14 h-14" viewBox="0 0 48 48" fill="none">
                  <path d="M14 18L24 8L34 18" stroke="rgba(212, 175, 55, 0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  <rect x="11" y="18" width="26" height="18" rx="3" stroke="rgba(212, 175, 55, 0.5)" strokeWidth="1.5" fill="rgba(212, 175, 55, 0.06)"/>
                  <circle cx="24" cy="27" r="5" stroke="rgba(212, 175, 55, 0.45)" strokeWidth="1.5" fill="rgba(212, 175, 55, 0.08)"/>
                  <path d="M24 24.5V29.5M21.5 27H26.5" stroke="rgba(212, 175, 55, 0.4)" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-2" style={{
              background: 'linear-gradient(135deg, #FFFFFF 0%, #D4AF37 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>No Teams Yet</h3>
            <p className="text-gray-500 mb-7">Get started by creating your first team</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #D4AF37 0%, #F0D770 50%, #D4AF37 100%)',
                border: '1px solid rgba(212, 175, 55, 0.5)',
                boxShadow: '0 4px 24px rgba(212, 175, 55, 0.3), 0 0 12px rgba(212, 175, 55, 0.1)',
                color: '#000000'
              }}
            >
              + Create First Team
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...teams].sort((a, b) => (b.filledSlots || 0) - (a.filledSlots || 0)).map((team) => {
              const spent = (team.budget || 0) - (team.remainingBudget || 0);
              const budgetPercent = (team.budget || 0) > 0 ? Math.min((spent / team.budget!) * 100, 100) : 0;
              const remaining = team.remainingBudget || 0;
              
              return (
                <div
                  key={team._id}
                  className="group relative h-full"
                >
                  {/* Luxury Card Container */}
                  <div className="relative overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.02] h-full flex flex-col"
                    style={{
                      background: 'linear-gradient(145deg, #0c0c0c 0%, #1a1a1a 50%, #0f0f0f 100%)',
                      border: '1px solid rgba(212, 175, 55, 0.15)',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)'
                    }}
                  >
                    {/* Subtle Ambient Glow */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
                      style={{ background: 'radial-gradient(circle, rgba(212, 175, 55, 0.4) 0%, transparent 70%)' }}
                    />

                    {/* Top Accent Line */}
                    <div className="absolute top-0 left-0 right-0 h-[2px]"
                      style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.6) 50%, transparent 100%)' }}
                    />

                    {/* Header Section */}
                    <div className="relative p-4 pb-3">
                      <div className="flex items-center gap-3">
                        {/* Team Logo/Initial */}
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)',
                            border: '1px solid rgba(212, 175, 55, 0.25)',
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
                          }}
                        >
                          {team.logoUrl ? (
                            <img src={team.logoUrl} alt={team.name} loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl font-light tracking-tight" style={{ color: '#D4AF37' }}>
                              {team.name.charAt(0)}
                            </span>
                          )}
                        </div>

                        {/* Team Name & Player Count */}
                        <div className="flex-1 min-w-0">
                          <h2 className="text-lg font-semibold tracking-tight truncate text-white group-hover:text-amber-100 transition-colors">
                            {team.name}
                          </h2>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-gray-500 font-medium">
                              {team.filledSlots || 0}/{team.totalSlots} Players
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="mx-4 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />

                    {/* Stats Section */}
                    <div className="p-4 pt-3 flex-1 flex flex-col">
                      {/* Budget Display */}
                      <div className="flex items-baseline justify-between mb-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-0.5">Spent</p>
                          <p className="text-2xl font-light tracking-tight" style={{ color: '#D4AF37' }}>
                            {formatCurrency(spent)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-0.5">Remaining</p>
                          <p className={`text-lg font-medium ${(team.budget || 0) === 0 ? 'text-gray-500' : remaining < (team.budget || 0) * 0.2 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {(team.budget || 0) > 0 ? formatCurrency(remaining) : '∞'}
                          </p>
                        </div>
                      </div>

                      {/* Elegant Progress Bar */}
                      <div className="relative h-1 rounded-full overflow-hidden mb-4"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      >
                        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${budgetPercent}%`,
                            background: budgetPercent > 80
                              ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                              : budgetPercent > 50
                              ? 'linear-gradient(90deg, #D4AF37, #F0D770)'
                              : 'linear-gradient(90deg, #10b981, #34d399)',
                            boxShadow: `0 0 10px ${budgetPercent > 80 ? 'rgba(239,68,68,0.5)' : budgetPercent > 50 ? 'rgba(212,175,55,0.5)' : 'rgba(16,185,129,0.5)'}`
                          }}
                        />
                      </div>

                      {/* Player Count */}
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-3xl font-light tracking-tight" style={{ color: (team.filledSlots || 0) > 0 ? '#D4AF37' : 'rgba(255,255,255,0.15)' }}>
                            {team.filledSlots || 0}
                          </p>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-1">
                            {(team.filledSlots || 0) === 1 ? 'Player' : 'Players'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Auctioneer Quick Actions */}
                    {isAuctioneer && (
                      <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                        <button
                          onClick={() => openEditModal(team)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                          style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            backdropFilter: 'blur(8px)'
                          }}
                          title="Edit"
                        >
                          <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(team._id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            backdropFilter: 'blur(8px)'
                          }}
                          title="Delete"
                        >
                          <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Bottom Accent */}
                    <div className="absolute bottom-0 left-0 right-0 h-[1px]"
                      style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.2) 50%, transparent 100%)' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          style={{ background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(12px)' }}
          onClick={resetForm}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(165deg, #0a0a0a 0%, #141414 40%, #0d0d0d 100%)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.95), 0 0 80px rgba(212, 175, 55, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
              maxHeight: 'calc(100vh - 2rem)'
            }}
          >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.6) 50%, transparent 100%)' }}
            />

            {/* Header */}
            <div className="relative px-6 py-5" style={{
              background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.06) 0%, transparent 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
            }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)',
                      border: '1px solid rgba(212, 175, 55, 0.25)'
                    }}
                  >
                    <span className="text-lg">{editingTeam ? '✏️' : '🏆'}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-white">
                      {editingTeam ? 'Edit Team' : 'New Team'}
                    </h2>
                    <p className="text-[11px] text-gray-500 font-medium">
                      {editingTeam ? 'Update team details' : 'Create a new auction team'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetForm}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)'
                  }}
                >
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Logo Upload */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 transition-all duration-300 hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.03) 100%)',
                      border: '1.5px solid rgba(212, 175, 55, 0.2)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                  >
                    {logoPreview || (editingTeam?.logoUrl) ? (
                      <img src={logoPreview || editingTeam?.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-7 h-7" style={{ color: 'rgba(212, 175, 55, 0.4)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1.5">Team Logo</label>
                    <label className="block cursor-pointer">
                      <div className="px-3 py-2 rounded-lg text-xs font-medium text-center transition-all duration-200 hover:scale-[1.02]"
                        style={{
                          background: 'rgba(212, 175, 55, 0.08)',
                          border: '1px dashed rgba(212, 175, 55, 0.25)',
                          color: '#D4AF37'
                        }}
                      >
                        {logoFile ? logoFile.name : 'Choose file...'}
                      </div>
                      <input
                        type="file"
                        accept="image/*,.heic,.heif,.svg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setLogoFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => setLogoPreview(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                    <p className="text-[9px] text-gray-600 mt-1">Optional · JPG, PNG, SVG, WebP</p>
                  </div>
                </div>

                {/* Team Name */}
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1.5">Team Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter team name..."
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all duration-300"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(212, 175, 55, 0.4)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2), 0 0 0 3px rgba(212, 175, 55, 0.08)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)'; }}
                  />
                </div>

                {/* Slots & Budget Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1.5">Total Slots</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.totalSlots}
                      onChange={(e) => setFormData({ ...formData, totalSlots: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all duration-300"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                      }}
                      onFocus={(e) => { e.target.style.borderColor = 'rgba(212, 175, 55, 0.4)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2), 0 0 0 3px rgba(212, 175, 55, 0.08)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)'; }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-1.5">Budget (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all duration-300"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                      }}
                      onFocus={(e) => { e.target.style.borderColor = 'rgba(212, 175, 55, 0.4)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2), 0 0 0 3px rgba(212, 175, 55, 0.08)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.2)'; }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-[1.02] disabled:opacity-50"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#9ca3af'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                    style={{
                      background: submitting ? 'rgba(212, 175, 55, 0.3)' : 'linear-gradient(135deg, #D4AF37 0%, #F0D770 50%, #D4AF37 100%)',
                      border: '1px solid rgba(212, 175, 55, 0.4)',
                      boxShadow: submitting ? 'none' : '0 4px 20px rgba(212, 175, 55, 0.3)',
                      color: '#000'
                    }}
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {logoFile ? 'Uploading...' : 'Saving...'}
                      </span>
                    ) : (
                      editingTeam ? 'Save Changes' : 'Create Team'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Bottom Accent */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px]"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.2) 50%, transparent 100%)' }}
            />
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-red-500/30 max-w-md w-full my-8 animate-slideUp">
            <div className="p-6">
              {/* Warning Icon */}
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-center mb-3 bg-gradient-to-r from-red-400 to-rose-400 text-transparent bg-clip-text">
                Reset Auction
              </h2>

              {/* Warning Message */}
              <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-4 mb-6">
                <p className="text-red-200 text-sm leading-relaxed text-center">
                  ⚠️ This will <span className="font-bold text-red-400">permanently delete</span> all teams and players from the auction.
                  <br />
                  <span className="text-xs text-red-300 mt-2 block">This action cannot be undone!</span>
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  disabled={resetting}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetAuction}
                  disabled={resetting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
                >
                  {resetting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Confirm Reset
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        open={!!deleteConfirmId}
        title="Delete Team?"
        message="Are you sure you want to delete this team? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteConfirmId) handleDelete(deleteConfirmId);
          setDeleteConfirmId(null);
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};

export default TeamsPage;