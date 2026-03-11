import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import AuctioneerDetailModal from '../components/AuctioneerDetailModal';
import { adminService, getStaleCached } from '../services/api';

interface Auctioneer {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  accessExpiry: string | null;
  createdAt: string;
  limits: {
    maxPlayers: number;
    maxTeams: number;
    maxAuctions?: number | null;
  };
  usage: {
    totalPlayers: number;
    totalTeams: number;
    totalAuctions?: number;
  };
}

const AuctioneersPage: React.FC = () => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  const [auctioneers, setAuctioneers] = useState<Auctioneer[]>(() => getStaleCached('admin:auctioneers') || []);
  const [loading, setLoading] = useState(() => !getStaleCached('admin:auctioneers'));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [selectedAuctioneer, setSelectedAuctioneer] = useState<Auctioneer | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const fetchAuctioneers = useCallback(async () => {
    try {
      const data = await adminService.getAuctioneers();
      setAuctioneers(data);
    } catch (error) {
      console.error('Failed to fetch auctioneers:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuctioneers();
  }, [fetchAuctioneers]);

  const isExpired = (accessExpiry: string | null) => {
    if (!accessExpiry) return false;
    return new Date(accessExpiry) < new Date();
  };

  const getFilteredAuctioneers = () => {
    return auctioneers.filter((auctioneer) => {
      // Search filter
      const matchesSearch =
        auctioneer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        auctioneer.email.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      let matchesStatus = true;
      if (filterStatus === 'active') {
        matchesStatus = auctioneer.isActive && !isExpired(auctioneer.accessExpiry);
      } else if (filterStatus === 'inactive') {
        matchesStatus = !auctioneer.isActive;
      } else if (filterStatus === 'expired') {
        matchesStatus = isExpired(auctioneer.accessExpiry);
      }

      return matchesSearch && matchesStatus;
    });
  };

  const handleCreateAuctioneer = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (createForm.password !== createForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (createForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setCreating(true);
    const toastId = toast.loading('Creating user...');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/admin/auctioneers/create`,
        {
          name: createForm.name,
          email: createForm.email,
          password: createForm.password,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      toast.update(toastId, {
        render: 'User created successfully!',
        type: 'success',
        isLoading: false,
        autoClose: 2000,
      });
      
      // Reset form and close modal
      setCreateForm({ name: '', email: '', password: '', confirmPassword: '' });
      setShowCreateModal(false);
      fetchAuctioneers();
    } catch (error: any) {
      toast.update(toastId, {
        render: error.response?.data?.error || 'Failed to create user',
        type: 'error',
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setCreating(false);
    }
  };



  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unlimited';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredAuctioneers = getFilteredAuctioneers();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid rgba(201,168,76,.15)', borderTopColor: '#c9a84c' }} />
          <p className="text-zinc-500 text-sm">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Users</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage auctioneer accounts and access</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:translate-y-[-1px]"
          style={{ background: 'rgba(201,168,76,.12)', color: '#c9a84c', border: '1px solid rgba(201,168,76,.2)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add User
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="rounded-xl p-3 flex flex-col sm:flex-row gap-2.5" style={{ background: '#0f0f12', border: '1px solid rgba(255,255,255,.06)' }}>
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1"
            style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', focusRingColor: 'rgba(201,168,76,.4)' } as any}
          />
        </div>
        <div className="sm:w-44">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-1 appearance-none cursor-pointer"
            style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}
          >
            <option value="all">All Users</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* User Cards Grid */}
      {filteredAuctioneers.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: '#0f0f12', border: '1px solid rgba(255,255,255,.06)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(255,255,255,.04)' }}>
            <svg className="w-7 h-7 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
          </div>
          <h3 className="text-sm font-medium text-white mb-1">No users found</h3>
          <p className="text-xs text-zinc-500">
            {searchTerm || filterStatus !== 'all' ? 'Try adjusting your search or filters' : 'Create your first user to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAuctioneers.map((auctioneer) => (
            <div
              key={auctioneer._id}
              onClick={() => { setSelectedAuctioneer(auctioneer); setShowDetailModal(true); }}
              className="rounded-xl p-4 transition-all duration-200 cursor-pointer group hover:translate-y-[-2px]"
              style={{ background: '#0f0f12', border: '1px solid rgba(255,255,255,.06)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,.2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.06)')}
            >
              {/* User Avatar and Status */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0" style={{ background: 'rgba(201,168,76,.1)', color: '#c9a84c', border: '1px solid rgba(201,168,76,.15)' }}>
                    {auctioneer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-white truncate group-hover:text-[#c9a84c] transition-colors">{auctioneer.name}</h3>
                    <p className="text-xs text-zinc-500 truncate">{auctioneer.email}</p>
                  </div>
                </div>
                {!auctioneer.isActive ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0" style={{ background: 'rgba(161,161,170,.1)', color: '#71717a', border: '1px solid rgba(161,161,170,.12)' }}>Inactive</span>
                ) : isExpired(auctioneer.accessExpiry) ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0" style={{ background: 'rgba(249,115,22,.1)', color: '#f97316', border: '1px solid rgba(249,115,22,.12)' }}>Expired</span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0" style={{ background: 'rgba(34,197,94,.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,.12)' }}>Active</span>
                )}
              </div>

              {/* Usage Stats */}
              <div className="space-y-2 mb-3">
                <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-zinc-400">Players</span>
                    <span className="text-xs font-semibold text-white">
                      {auctioneer.usage.totalPlayers} / {auctioneer.limits.maxPlayers || '∞'}
                    </span>
                  </div>
                  {auctioneer.limits.maxPlayers > 0 && (
                    <div className="w-full rounded-full h-1" style={{ background: 'rgba(255,255,255,.06)' }}>
                      <div className="h-1 rounded-full transition-all" style={{ width: `${Math.min((auctioneer.usage.totalPlayers / auctioneer.limits.maxPlayers) * 100, 100)}%`, background: '#c9a84c' }} />
                    </div>
                  )}
                </div>
                <div className="rounded-lg p-2.5" style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.04)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-zinc-400">Teams</span>
                    <span className="text-xs font-semibold text-white">
                      {auctioneer.usage.totalTeams} / {auctioneer.limits.maxTeams || '∞'}
                    </span>
                  </div>
                  {auctioneer.limits.maxTeams > 0 && (
                    <div className="w-full rounded-full h-1" style={{ background: 'rgba(255,255,255,.06)' }}>
                      <div className="h-1 rounded-full transition-all" style={{ width: `${Math.min((auctioneer.usage.totalTeams / auctioneer.limits.maxTeams) * 100, 100)}%`, background: '#a78bfa' }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Access & Member Info */}
              <div className="space-y-1.5 pt-2.5" style={{ borderTop: '1px solid rgba(255,255,255,.04)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">Access Expires</span>
                  <span className="text-[11px] font-medium text-zinc-300">{formatDate(auctioneer.accessExpiry)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500">Member Since</span>
                  <span className="text-[11px] font-medium text-zinc-300">{new Date(auctioneer.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Manage link */}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-[#c9a84c] opacity-60 group-hover:opacity-100 transition-opacity">
                <span>Manage Account</span>
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedAuctioneer && (
        <AuctioneerDetailModal
          auctioneer={selectedAuctioneer}
          isOpen={showDetailModal}
          onClose={() => { setShowDetailModal(false); setTimeout(() => setSelectedAuctioneer(null), 300); }}
          onUpdate={() => { fetchAuctioneers(); }}
        />
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-xl shadow-2xl w-full max-w-md" style={{ background: '#0f0f12', border: '1px solid rgba(255,255,255,.08)' }}>
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
              <h2 className="text-base font-semibold text-white">Create New User</h2>
              <button
                onClick={() => { setShowCreateModal(false); setCreateForm({ name: '', email: '', password: '', confirmPassword: '' }); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateAuctioneer} className="px-5 py-4 space-y-3.5">
              <div>
                <label htmlFor="name" className="block text-xs font-medium text-zinc-400 mb-1.5">Full Name</label>
                <input
                  id="name" type="text" required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1"
                  style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-zinc-400 mb-1.5">Email Address</label>
                <input
                  id="email" type="email" required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1"
                  style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
                <input
                  id="password" type="password" required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1"
                  style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-medium text-zinc-400 mb-1.5">Confirm Password</label>
                <input
                  id="confirmPassword" type="password" required
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1"
                  style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}
                  placeholder="Re-enter password"
                />
              </div>
              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setCreateForm({ name: '', email: '', password: '', confirmPassword: '' }); }}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 transition-colors"
                  style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={creating}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-black disabled:opacity-50 transition-all"
                  style={{ background: '#c9a84c' }}
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctioneersPage;
