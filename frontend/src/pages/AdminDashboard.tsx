import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { adminService, getStaleCached } from '../services/api';
import SEO from '../components/SEO';

interface DashboardStats {
  totalAuctioneers: number;
  activeAuctioneers: number;
  inactiveAuctioneers: number;
  expiredAuctioneers: number;
  totalPlayers: number;
  totalTeams: number;
}

interface Auctioneer {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  accessExpiry: string | null;
  createdAt: string;
  limits: {
    maxPlayers: number | null;
    maxTeams: number | null;
    maxAuctions: number | null;
  };
  usage: {
    totalPlayers: number;
    totalTeams: number;
    totalAuctions: number;
  };
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>(() => getStaleCached('admin:stats') || {
    totalAuctioneers: 0,
    activeAuctioneers: 0,
    inactiveAuctioneers: 0,
    expiredAuctioneers: 0,
    totalPlayers: 0,
    totalTeams: 0,
  });
  const [recentAuctioneers, setRecentAuctioneers] = useState<Auctioneer[]>(() => {
    const cached = getStaleCached('admin:auctioneers');
    return cached ? cached.slice(0, 5) : [];
  });
  const [loading, setLoading] = useState(() => !getStaleCached('admin:stats'));

  const fetchData = useCallback(async () => {
    try {
      const [statsData, auctioneersData] = await Promise.all([
        adminService.getStats(),
        adminService.getAuctioneers(),
      ]);
      setStats(statsData);
      if (Array.isArray(auctioneersData)) {
        setRecentAuctioneers(auctioneersData.slice(0, 5));
      }
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isExpired = (accessExpiry: string | null) => {
    if (!accessExpiry) return false;
    return new Date(accessExpiry) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '3px solid rgba(201,168,76,.15)', borderTopColor: '#c9a84c' }} />
          <p className="text-zinc-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats.totalAuctioneers, color: '#c9a84c', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
    )},
    { label: 'Active', value: stats.activeAuctioneers, color: '#22c55e', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    )},
    { label: 'Players', value: stats.totalPlayers, color: '#a78bfa', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
    )},
    { label: 'Teams', value: stats.totalTeams, color: '#f97316', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
    )},
  ];

  return (
    <>
    <SEO
      title="Dashboard | BidSport"
      description="Manage your sports auction from the BidSport dashboard."
      noIndex={true}
    />
    <div className="space-y-6 pb-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-white">
          Welcome back, {user?.name}
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Here's what's happening with your platform.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-4 transition-all duration-200 hover:translate-y-[-2px]"
            style={{ background: '#0f0f12', border: '1px solid rgba(255,255,255,.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${card.color}10`, color: card.color }}>
                {card.icon}
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl p-4" style={{ background: '#0f0f12', border: '1px solid rgba(255,255,255,.06)' }}>
        <h2 className="text-sm font-semibold text-white mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Link
            to="/admin/auctioneers"
            className="flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:translate-y-[-1px] group"
            style={{ background: 'rgba(201,168,76,.06)', border: '1px solid rgba(201,168,76,.1)' }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,168,76,.12)', color: '#c9a84c' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Add New User</h3>
              <p className="text-xs text-zinc-500">Create auctioneer account</p>
            </div>
          </Link>
          <Link
            to="/admin/auctioneers"
            className="flex items-center gap-3 p-3 rounded-lg transition-all duration-200 hover:translate-y-[-1px] group"
            style={{ background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)' }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,.06)', color: '#a1a1aa' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Manage Users</h3>
              <p className="text-xs text-zinc-500">View all auctioneers</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Users */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#0f0f12', border: '1px solid rgba(255,255,255,.06)' }}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          <h2 className="text-sm font-semibold text-white">Recent Users</h2>
          <Link to="/admin/auctioneers" className="text-xs font-medium transition-colors" style={{ color: '#c9a84c' }}>
            View all &rarr;
          </Link>
        </div>

        {recentAuctioneers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(255,255,255,.04)' }}>
              <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
            </div>
            <p className="text-sm text-zinc-400">No users registered yet</p>
            <p className="text-xs text-zinc-600 mt-1">New registrations will appear here</p>
          </div>
        ) : (
          <div className="max-h-[340px] overflow-y-auto">
            {recentAuctioneers.map((auctioneer, i) => (
              <Link
                key={auctioneer._id}
                to="/admin/auctioneers"
                className="flex items-center justify-between px-4 py-3 transition-colors group"
                style={{
                  borderBottom: i < recentAuctioneers.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: 'rgba(201,168,76,.1)', color: '#c9a84c', border: '1px solid rgba(201,168,76,.15)' }}>
                    {auctioneer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-white truncate group-hover:text-[#c9a84c] transition-colors">{auctioneer.name}</h3>
                    <p className="text-xs text-zinc-500 truncate">{auctioneer.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="hidden sm:flex items-center gap-4 text-xs mr-2">
                    <div className="text-center">
                      <p className="font-semibold text-white">{auctioneer.usage.totalPlayers}</p>
                      <p className="text-zinc-600">Players</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-white">{auctioneer.usage.totalTeams}</p>
                      <p className="text-zinc-600">Teams</p>
                    </div>
                  </div>
                  {!auctioneer.isActive ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-medium" style={{ background: 'rgba(161,161,170,.1)', color: '#71717a', border: '1px solid rgba(161,161,170,.15)' }}>Inactive</span>
                  ) : isExpired(auctioneer.accessExpiry) ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-medium" style={{ background: 'rgba(249,115,22,.1)', color: '#f97316', border: '1px solid rgba(249,115,22,.15)' }}>Expired</span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-medium" style={{ background: 'rgba(34,197,94,.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,.15)' }}>Active</span>
                  )}
                  <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default AdminDashboard;
