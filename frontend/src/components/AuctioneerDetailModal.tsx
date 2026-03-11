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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md">
                {auctioneer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{auctioneer.name}</h2>
                <p className="text-xs text-slate-600">{auctioneer.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  {!auctioneer.isActive ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700">
                      <span className="w-1 h-1 rounded-full bg-slate-500 mr-1"></span>
                      Inactive
                    </span>
                  ) : isExpired(auctioneer.accessExpiry) ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700">
                      <span className="w-1 h-1 rounded-full bg-orange-500 mr-1"></span>
                      Expired
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                      <span className="w-1 h-1 rounded-full bg-green-500 mr-1"></span>
                      Active
                    </span>
                  )}
                  {auctioneer.accessExpiry && (
                    <span className="text-[10px] text-slate-500">
                      • Expires {format(new Date(auctioneer.accessExpiry), 'MMM dd, yyyy')}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex-shrink-0 px-4 py-2 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-slate-900">{auctioneer.usage.totalPlayers}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">Players</div>
              <div className="text-[10px] text-slate-500">
                {auctioneer.limits.maxPlayers === 0 ? 'Unlimited' : `of ${auctioneer.limits.maxPlayers}`}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-slate-900">{auctioneer.usage.totalTeams}</div>
              <div className="text-[10px] text-slate-600 mt-0.5">Teams</div>
              <div className="text-[10px] text-slate-500">
                {auctioneer.limits.maxTeams === 0 ? 'Unlimited' : `of ${auctioneer.limits.maxTeams}`}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {auctioneer.limits.maxPlayers === 0 ? '—' : `${Math.round(playersPercentage)}%`}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">Player Usage</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {auctioneer.limits.maxTeams === 0 ? '—' : `${Math.round(teamsPercentage)}%`}
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5">Team Usage</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 px-4 border-b border-slate-200 bg-white">
          <div className="py-2 text-xs font-semibold text-slate-900">
            Complete Account Overview
          </div>
        </div>

        {/* Scrollable Content - All Sections */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {error && (
            <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-3 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-xs">
              {successMessage}
            </div>
          )}

          <div className="space-y-3">
            {/* Account Information */}
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <h3 className="text-xs font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                <span className="text-sm">📋</span> Account Information
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-slate-600 mb-0.5">Email</p>
                  <p className="text-xs text-slate-900">{auctioneer.email}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-600 mb-0.5">Status</p>
                  <p className="text-xs text-slate-900">
                    {!auctioneer.isActive ? 'Inactive' : isExpired(auctioneer.accessExpiry) ? 'Expired' : 'Active'}
                  </p>
                </div>
                {auctioneer.accessExpiry && (
                  <div>
                    <p className="text-[10px] text-slate-600 mb-0.5">Access Expires</p>
                    <p className="text-xs text-slate-900">
                      {format(new Date(auctioneer.accessExpiry), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-slate-600 mb-0.5">Member Since</p>
                  <p className="text-xs text-slate-900">
                    {format(new Date(auctioneer.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>

            {/* Usage Details */}
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <h3 className="text-xs font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                <span className="text-sm">📊</span> Usage Details
              </h3>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-700">Player Slots</span>
                    <span className="text-xs font-semibold text-slate-900">
                      {auctioneer.usage.totalPlayers} / {auctioneer.limits.maxPlayers === 0 ? '∞' : auctioneer.limits.maxPlayers}
                    </span>
                  </div>
                  {auctioneer.limits.maxPlayers > 0 && (
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(playersPercentage, 100)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-700">Team Slots</span>
                    <span className="text-xs font-semibold text-slate-900">
                      {auctioneer.usage.totalTeams} / {auctioneer.limits.maxTeams === 0 ? '∞' : auctioneer.limits.maxTeams}
                    </span>
                  </div>
                  {auctioneer.limits.maxTeams > 0 && (
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(teamsPercentage, 100)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Resource Limits */}
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <h3 className="text-xs font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                <span className="text-sm">⚙️</span> Resource Limits
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-medium text-slate-700 mb-1">
                    Max Players (0 = unlimited)
                  </label>
                  <input
                    type="number"
                    value={maxPlayers || 0}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-700 mb-1">
                    Max Teams (0 = unlimited)
                  </label>
                  <input
                    type="number"
                    value={maxTeams || 0}
                    onChange={(e) => setMaxTeams(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <button
                  onClick={handleUpdateLimits}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors"
                >
                  {loading ? 'Updating...' : 'Update Limits'}
                </button>
              </div>
            </div>

            {/* Access Management */}
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <h3 className="text-xs font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                <span className="text-sm">🔑</span> Access Management
              </h3>
              <div className="space-y-1.5">
                <div>
                  <label className="block text-[10px] font-medium text-slate-700 mb-1">
                    Access Duration (days, 0 = unlimited)
                  </label>
                  <input
                    type="number"
                    value={accessDays}
                    onChange={(e) => setAccessDays(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="0"
                    placeholder="e.g., 30, 60, 90"
                  />
                </div>
                <button
                  onClick={handleGrantAccess}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors"
                >
                  {accessDays > 0 ? `Grant ${accessDays} Days Access` : 'Grant Unlimited Access'}
                </button>
                <button
                  onClick={() => setRevokeConfirm(true)}
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors"
                >
                  Revoke Access
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 rounded-lg border border-red-200 p-3">
              <h3 className="text-xs font-semibold text-red-900 mb-2 flex items-center gap-1.5">
                <span className="text-sm">⚠️</span> Danger Zone
              </h3>
              <div className="space-y-1.5">
                <button
                  onClick={handleResetData}
                  disabled={loading}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors"
                >
                  Reset All Data
                </button>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white py-1.5 px-3 rounded-lg text-xs font-medium transition-colors"
                >
                  Delete Account
                </button>
              </div>
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
