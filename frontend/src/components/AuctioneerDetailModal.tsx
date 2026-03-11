import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import ConfirmModal from './ConfirmModal';

interface Auctioneer {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  accessExpiry: string | null;
  limits: {
    maxPlayers: number;
    maxTeams: number;
  };
  usage: {
    totalPlayers: number;
    totalTeams: number;
  };
  createdAt: string;
  lastLogin?: string;
}

interface AuctioneerDetailModalProps {
  auctioneer: Auctioneer;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const AuctioneerDetailModal: React.FC<AuctioneerDetailModalProps> = ({
  auctioneer,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  const [maxPlayers, setMaxPlayers] = useState(auctioneer.limits.maxPlayers || 0);
  const [maxTeams, setMaxTeams] = useState(auctioneer.limits.maxTeams || 0);
  const [accessDays, setAccessDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setMaxPlayers(auctioneer.limits.maxPlayers || 0);
    setMaxTeams(auctioneer.limits.maxTeams || 0);
  }, [auctioneer]);

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const handleUpdateLimits = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      const token = localStorage.getItem('token');
      await axios.put(
        `${API_URL}/admin/auctioneers/${auctioneer._id}`,
        {
          limits: {
            maxPlayers: Number(maxPlayers),
            maxTeams: Number(maxTeams),
          },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccessMessage('Limits updated successfully');
      onUpdate();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update limits');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/admin/auctioneers/${auctioneer._id}/grant-access`,
        { days: accessDays },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccessMessage('Access granted successfully');
      onUpdate();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to grant access');
    } finally {
      setLoading(false);
    }
  };

  const [revokeConfirm, setRevokeConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleRevokeAccess = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/admin/auctioneers/${auctioneer._id}/revoke-access`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccessMessage('Access revoked successfully');
      onUpdate();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to revoke access');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/admin/auctioneers/${auctioneer._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccessMessage('Auctioneer deleted successfully');
      onUpdate();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete auctioneer');
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    const confirmMessage = `⚠️ CRITICAL WARNING ⚠️

This will PERMANENTLY DELETE ALL data for ${auctioneer.name}:

✗ ${auctioneer.usage.totalPlayers} Players (with photos)
✗ ${auctioneer.usage.totalTeams} Teams (with logos)
✗ All form configurations
✗ All uploaded images

The auctioneer account will remain, but ALL their data will be GONE FOREVER.

Type "DELETE" to confirm this action.`;

    const userInput = window.prompt(confirmMessage);
    if (userInput !== 'DELETE') {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `${API_URL}/admin/auctioneers/${auctioneer._id}/reset`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = response.data.data;
      setSuccessMessage(
        `✅ Data reset complete! Deleted: ${data.deletedPlayers} players, ${data.deletedTeams} teams, ${data.deletedPlayerPhotos} photos, ${data.deletedTeamLogos} logos`
      );
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset auctioneer data');
    } finally {
      setLoading(false);
    }
  };

  const playersPercentage = auctioneer.limits.maxPlayers > 0 
    ? (auctioneer.usage.totalPlayers / auctioneer.limits.maxPlayers) * 100 
    : 0;
  const teamsPercentage = auctioneer.limits.maxTeams > 0
    ? (auctioneer.usage.totalTeams / auctioneer.limits.maxTeams) * 100
    : 0;

  if (!isOpen) return null;

  const statusColor = !auctioneer.isActive ? '#71717a' : isExpired(auctioneer.accessExpiry) ? '#f97316' : '#22c55e';
  const statusLabel = !auctioneer.isActive ? 'Inactive' : isExpired(auctioneer.accessExpiry) ? 'Expired' : 'Active';
  const maxP = auctioneer.limits.maxPlayers;
  const maxT = auctioneer.limits.maxTeams;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ background: '#111114', border: '1px solid rgba(255,255,255,.07)' }}>

        {/* ── Header ── */}
        <div className="flex-shrink-0 p-5 sm:p-6 pb-0">
          {/* Close */}
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-colors z-10">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {/* Profile row */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(201,168,76,.2), rgba(201,168,76,.08))', color: '#c9a84c', border: '1px solid rgba(201,168,76,.25)' }}>
              {auctioneer.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-semibold text-white truncate">{auctioneer.name}</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}30` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                  {statusLabel}
                </span>
              </div>
              <p className="text-sm text-zinc-400 mt-0.5 truncate">{auctioneer.email}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                <span>Joined {format(new Date(auctioneer.createdAt), 'MMM dd, yyyy')}</span>
                {auctioneer.accessExpiry && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-zinc-700" />
                    <span style={{ color: isExpired(auctioneer.accessExpiry) ? '#f97316' : undefined }}>
                      {isExpired(auctioneer.accessExpiry) ? 'Expired' : 'Expires'} {format(new Date(auctioneer.accessExpiry), 'MMM dd, yyyy')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-4 gap-2 mt-5">
            {[
              { value: auctioneer.usage.totalPlayers, label: 'Players', sub: !maxP ? 'Unlimited' : `of ${maxP}`, color: '#c9a84c' },
              { value: auctioneer.usage.totalTeams, label: 'Teams', sub: !maxT ? 'Unlimited' : `of ${maxT}`, color: '#a78bfa' },
              { value: maxP ? `${Math.round(playersPercentage)}%` : '∞', label: 'Player Use', sub: maxP ? `${auctioneer.usage.totalPlayers}/${maxP}` : 'No limit', color: '#22c55e' },
              { value: maxT ? `${Math.round(teamsPercentage)}%` : '∞', label: 'Team Use', sub: maxT ? `${auctioneer.usage.totalTeams}/${maxT}` : 'No limit', color: '#06b6d4' },
            ].map((s) => (
              <div key={s.label} className="text-center rounded-xl py-3 px-2" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.05)' }}>
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-[11px] font-medium mt-0.5" style={{ color: s.color }}>{s.label}</div>
                <div className="text-[10px] text-zinc-600 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 pt-4 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(201,168,76,.3) transparent' }}>
          {/* Alerts */}
          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.15)', color: '#f87171' }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}
          {successMessage && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.15)', color: '#4ade80' }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {successMessage}
            </div>
          )}

          {/* Usage bars */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)' }}>
            <h3 className="text-sm font-semibold text-white mb-3">Usage Overview</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm text-zinc-400">Players</span>
                  <span className="text-sm font-medium text-white">{auctioneer.usage.totalPlayers} <span className="text-zinc-500">/ {!maxP ? '∞' : maxP}</span></span>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: 'rgba(255,255,255,.06)' }}>
                  <div className="h-2 rounded-full transition-all duration-500" style={{ width: maxP ? `${Math.min(playersPercentage, 100)}%` : '100%', background: maxP ? '#c9a84c' : 'rgba(201,168,76,.3)' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm text-zinc-400">Teams</span>
                  <span className="text-sm font-medium text-white">{auctioneer.usage.totalTeams} <span className="text-zinc-500">/ {!maxT ? '∞' : maxT}</span></span>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: 'rgba(255,255,255,.06)' }}>
                  <div className="h-2 rounded-full transition-all duration-500" style={{ width: maxT ? `${Math.min(teamsPercentage, 100)}%` : '100%', background: maxT ? '#a78bfa' : 'rgba(167,139,250,.3)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Two-column: Resource Limits + Access */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Resource Limits */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)' }}>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>
                Limits
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Max Players</label>
                  <input
                    type="number" value={maxPlayers || 0} onChange={(e) => setMaxPlayers(Number(e.target.value))} min="0"
                    className="w-full px-3 py-2 text-sm rounded-lg text-white placeholder-zinc-600 focus:outline-none transition-colors"
                    style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(201,168,76,.4)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,.08)'; }}
                  />
                  <p className="text-[10px] text-zinc-600 mt-1">0 = unlimited</p>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Max Teams</label>
                  <input
                    type="number" value={maxTeams || 0} onChange={(e) => setMaxTeams(Number(e.target.value))} min="0"
                    className="w-full px-3 py-2 text-sm rounded-lg text-white placeholder-zinc-600 focus:outline-none transition-colors"
                    style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(201,168,76,.4)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,.08)'; }}
                  />
                  <p className="text-[10px] text-zinc-600 mt-1">0 = unlimited</p>
                </div>
                <button
                  onClick={handleUpdateLimits} disabled={loading}
                  className="w-full py-2 px-3 rounded-lg text-sm font-medium text-black disabled:opacity-50 transition-all hover:brightness-110"
                  style={{ background: '#c9a84c' }}
                >
                  {loading ? 'Saving...' : 'Save Limits'}
                </button>
              </div>
            </div>

            {/* Access Management */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.05)' }}>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>
                Access
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Duration (days)</label>
                  <input
                    type="number" value={accessDays} onChange={(e) => setAccessDays(Number(e.target.value))} min="0" placeholder="30"
                    className="w-full px-3 py-2 text-sm rounded-lg text-white placeholder-zinc-600 focus:outline-none transition-colors"
                    style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)' }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(34,197,94,.4)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,.08)'; }}
                  />
                  <p className="text-[10px] text-zinc-600 mt-1">0 = unlimited access</p>
                </div>
                <button
                  onClick={handleGrantAccess} disabled={loading}
                  className="w-full py-2 px-3 rounded-lg text-sm font-medium disabled:opacity-50 transition-all hover:brightness-110"
                  style={{ background: 'rgba(34,197,94,.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,.2)' }}
                >
                  {accessDays > 0 ? `Grant ${accessDays} Days` : 'Grant Unlimited'}
                </button>
                <button
                  onClick={() => setRevokeConfirm(true)} disabled={loading}
                  className="w-full py-2 px-3 rounded-lg text-sm font-medium disabled:opacity-50 transition-all hover:brightness-110"
                  style={{ background: 'rgba(249,115,22,.1)', color: '#fb923c', border: '1px solid rgba(249,115,22,.15)' }}
                >
                  Revoke Access
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,.03)', border: '1px solid rgba(239,68,68,.1)' }}>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-1" style={{ color: '#f87171' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
              Danger Zone
            </h3>
            <p className="text-xs text-zinc-500 mb-3">These actions are irreversible. Please be certain.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleResetData} disabled={loading}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-medium disabled:opacity-50 transition-all hover:brightness-125"
                style={{ background: 'rgba(234,179,8,.1)', color: '#facc15', border: '1px solid rgba(234,179,8,.15)' }}
              >
                Reset All Data
              </button>
              <button
                onClick={() => setDeleteConfirm(true)} disabled={loading}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-medium disabled:opacity-50 transition-all hover:brightness-125"
                style={{ background: 'rgba(239,68,68,.1)', color: '#f87171', border: '1px solid rgba(239,68,68,.15)' }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={revokeConfirm}
        title="Revoke Access?"
        message="Are you sure you want to revoke access for this auctioneer?"
        confirmLabel="Revoke"
        variant="warning"
        onConfirm={() => {
          setRevokeConfirm(false);
          handleRevokeAccess();
        }}
        onCancel={() => setRevokeConfirm(false)}
      />
      <ConfirmModal
        open={deleteConfirm}
        title="Delete Auctioneer?"
        message="Are you sure you want to delete this auctioneer? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          setDeleteConfirm(false);
          handleDelete();
        }}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
};

export default AuctioneerDetailModal;
