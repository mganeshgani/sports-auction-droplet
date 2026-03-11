import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useRoutePreload } from '../hooks/useRoutePreload';

interface BrandingConfig {
  title: string;
  subtitle: string;
  logoUrl: string;
}

// Get cached branding from localStorage or use defaults
const getCachedBranding = (): BrandingConfig => {
  try {
    const cached = localStorage.getItem('brandingConfig');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // Ignore parse errors
  }
  return {
    title: 'SPORTS AUCTION',
    subtitle: 'St Aloysius (Deemed To Be University)',
    logoUrl: '/logo.png'
  };
};

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { preloadRoute } = useRoutePreload();
  const [showLimitsDetails, setShowLimitsDetails] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  
  // Initialize with cached branding to prevent flash
  const [branding, setBranding] = useState<BrandingConfig>(getCachedBranding);

  // Fetch branding config only once per session (use sessionStorage to track)
  useEffect(() => {
    const hasFetchedBranding = sessionStorage.getItem('brandingFetched');
    if (hasFetchedBranding) return; // Already fetched this session
    
    const fetchBranding = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await axios.get(`${API_URL}/config`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data?.data?.branding) {
            const b = response.data.data.branding;
            const newBranding = {
              title: b.title || 'SPORTS AUCTION',
              subtitle: b.subtitle || 'St Aloysius (Deemed To Be University)',
              logoUrl: b.logoUrl || '/logo.png'
            };
            setBranding(newBranding);
            localStorage.setItem('brandingConfig', JSON.stringify(newBranding));
            sessionStorage.setItem('brandingFetched', 'true');
          }
        }
      } catch (error) {
        console.error('Error fetching branding config:', error);
      }
    };
    fetchBranding();
  }, [API_URL]);

  // Listen for branding updates from Settings page
  useEffect(() => {
    const handleBrandingUpdate = () => {
      setBranding(getCachedBranding());
    };
    window.addEventListener('brandingUpdated', handleBrandingUpdate);
    return () => window.removeEventListener('brandingUpdated', handleBrandingUpdate);
  }, []);
  
  const navigation = [
    { name: 'Auction', href: '/auction' },
    { name: 'Teams', href: '/teams' },
    { name: 'Players', href: '/players' },
    { name: 'Unsold', href: '/unsold' },
    { name: 'Results', href: '/results' },
  ];

  // Add Admin link for admin users
  const { isAdmin } = useAuth();
  const allNavigation = isAdmin 
    ? [...navigation, { name: 'Admin', href: '/admin' }]
    : navigation;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  // Check if limits are reached
  const isPlayersLimitReached = user?.limits?.maxPlayers && user?.usage?.totalPlayers 
    ? user.usage.totalPlayers >= user.limits.maxPlayers 
    : false;
  const isTeamsLimitReached = user?.limits?.maxTeams && user?.usage?.totalTeams
    ? user.usage.totalTeams >= user.limits.maxTeams
    : false;

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{
      background: 'linear-gradient(160deg, #000000 0%, #0a0a0a 25%, #1a1a1a 50%, #0f172a 75%, #1a1a1a 100%)',
      backgroundAttachment: 'fixed'
    }}>
      {/* Premium Header */}
      <header className="flex-shrink-0 relative z-50" style={{
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(26, 26, 26, 0.9) 50%, rgba(0, 0, 0, 0.95) 100%)',
        backdropFilter: 'blur(25px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(25px) saturate(1.5)',
        borderBottom: '2px solid rgba(212, 175, 55, 0.3)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.8), 0 0 40px rgba(212, 175, 55, 0.1)'
      }}>
        <div className="max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between h-20">
            {/* Logo Section */}
            <div className="flex items-center -ml-2">
              <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 flex items-center justify-center">
                  <img 
                    src={branding.logoUrl || '/logo.png'} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // Fallback to lightning emoji if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.fallback-icon')) {
                        const fallback = document.createElement('span');
                        fallback.className = 'fallback-icon';
                        fallback.textContent = '⚡';
                        fallback.style.fontSize = '24px';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col gap-0.5 sm:gap-1">
                  <h1 className="text-base sm:text-lg md:text-xl lg:text-[1.75rem] font-bold leading-tight"
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      background: 'linear-gradient(180deg, #FFFFFF 0%, #F5F5F0 30%, #FFD700 60%, #D4AF37 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      letterSpacing: '0.05em',
                      filter: 'drop-shadow(0 2px 10px rgba(212, 175, 55, 0.3))'
                    }}>
                    {branding.title}
                  </h1>
                  <p className="text-[0.5rem] sm:text-[0.6rem] md:text-xs uppercase tracking-wider opacity-90 hidden sm:block"
                    style={{
                      fontFamily: "'Montserrat', sans-serif",
                      fontWeight: 500,
                      color: '#D4AF37',
                      letterSpacing: '0.15em'
                    }}>
                    {branding.subtitle}
                  </p>
                </div>
              </div>
              
              {/* Desktop Navigation */}
              <nav className="hidden lg:ml-10 lg:flex lg:space-x-2">
                {allNavigation.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="group relative"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px 16px',
                        fontSize: '0.8125rem',
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: isActive ? '#FFD700' : '#FFFFFF',
                        background: isActive 
                          ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(255, 215, 0, 0.1) 100%)'
                          : 'transparent',
                        backdropFilter: isActive ? 'blur(10px)' : 'none',
                        border: isActive 
                          ? '1px solid rgba(212, 175, 55, 0.4)'
                          : '1px solid transparent',
                        borderRadius: '10px',
                        transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                        textShadow: isActive ? '0 0 10px rgba(255, 215, 0, 0.5)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        // Preload route on hover for instant navigation
                        preloadRoute(item.href);
                        
                        if (!isActive) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)';
                          e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.2)';
                          e.currentTarget.style.color = '#FFD700';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.borderColor = 'transparent';
                          e.currentTarget.style.color = '#FFFFFF';
                        }
                      }}
                    >
                      {item.name}
                      {isActive && (
                        <div style={{
                          position: 'absolute',
                          bottom: '-2px',
                          left: '20px',
                          right: '20px',
                          height: '2px',
                          background: 'linear-gradient(90deg, transparent 0%, #FFD700 50%, transparent 100%)',
                          boxShadow: '0 0 10px rgba(255, 215, 0, 0.8)'
                        }} />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right Side - User Info & Status */}
            <div className="flex items-center gap-1 sm:gap-3 relative z-[100]">
              {/* Ultra-Premium User Menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="group relative flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 pr-2 sm:pr-4 py-1 sm:py-1.5 rounded-full transition-all duration-500 overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(26, 26, 26, 0.9) 50%, rgba(0, 0, 0, 0.8) 100%)',
                    border: '1.5px solid rgba(212, 175, 55, 0.5)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.6), 0 0 30px rgba(212, 175, 55, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.8)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.7), 0 0 40px rgba(212, 175, 55, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.5)';
                    e.currentTarget.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.6), 0 0 30px rgba(212, 175, 55, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-1000 ease-out" style={{ transform: 'translateX(-100%)' }}></div>
                  
                  {/* User Avatar with Glow Ring */}
                  <div className="relative" style={{
                    padding: '2px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #D4AF37 0%, #F0D770 50%, #D4AF37 100%)'
                  }}>
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)'
                      }}>
                      <span className="text-xs sm:text-sm font-extrabold"
                        style={{
                          background: 'linear-gradient(135deg, #F0D770 0%, #D4AF37 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          filter: 'drop-shadow(0 1px 2px rgba(212, 175, 55, 0.5))'
                        }}>
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    {/* Online Indicator */}
                    <div style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      border: '2px solid #0a0a0a',
                      boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)'
                    }}></div>
                  </div>
                  
                  {/* User Name Only */}
                  <span className="relative z-10 text-xs sm:text-sm font-semibold max-w-[60px] sm:max-w-[100px] truncate hidden sm:inline" style={{
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #E5E5E5 50%, #D4AF37 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '0.02em'
                  }}>{user?.name}</span>
                  
                  {/* Dropdown Arrow */}
                  <svg
                    className="relative z-10 transition-transform duration-300 ml-0.5 sm:ml-1 w-2.5 h-2.5 sm:w-3 sm:h-3"
                    style={{
                      color: '#D4AF37',
                      transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                      filter: 'drop-shadow(0 1px 2px rgba(212, 175, 55, 0.4))'
                    }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div
                    className="absolute right-0 mt-3 w-56 rounded-2xl shadow-2xl z-[9999] overflow-hidden"
                    style={{
                      background: 'linear-gradient(145deg, rgba(10, 10, 10, 0.98) 0%, rgba(26, 26, 26, 0.98) 100%)',
                      border: '1.5px solid rgba(212, 175, 55, 0.4)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(212, 175, 55, 0.1)'
                    }}
                  >
                    {/* User Info Header */}
                    <div className="p-4" style={{
                      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%)',
                      borderBottom: '1px solid rgba(212, 175, 55, 0.2)'
                    }}>
                      <div className="flex items-center gap-3">
                        <div style={{
                          padding: '2px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #D4AF37 0%, #F0D770 100%)'
                        }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <span style={{
                              fontSize: '18px',
                              fontWeight: 800,
                              background: 'linear-gradient(135deg, #F0D770 0%, #D4AF37 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text'
                            }}>
                              {user?.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="p-2">
                      {user?.role === 'auctioneer' && (
                        <>
                          {/* Account Details - Collapsible Card */}
                          <div className="mb-1.5">
                            <button
                              onClick={() => setShowLimitsDetails(!showLimitsDetails)}
                              className="w-full group flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-300"
                              style={{ 
                                background: showLimitsDetails 
                                  ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.08) 100%)'
                                  : 'transparent',
                                border: showLimitsDetails
                                  ? '1px solid rgba(99, 102, 241, 0.2)'
                                  : '1px solid transparent'
                              }}
                              onMouseEnter={(e) => {
                                if (!showLimitsDetails) {
                                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!showLimitsDetails) {
                                  e.currentTarget.style.background = 'transparent';
                                }
                              }}
                            >
                              <div className="flex items-center gap-2.5">
                                <div style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.15) 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-semibold text-white">Account Details</p>
                                  <p className="text-[9px] text-slate-500">Usage & access info</p>
                                </div>
                              </div>
                              <svg 
                                className="w-4 h-4 text-indigo-400 transition-transform duration-300" 
                                style={{ transform: showLimitsDetails ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            {/* Expandable Details Card */}
                            <div 
                              style={{
                                maxHeight: showLimitsDetails ? '400px' : '0',
                                opacity: showLimitsDetails ? 1 : 0,
                                overflow: 'hidden',
                                transition: 'all 0.3s ease-in-out'
                              }}
                            >
                              <div className="mt-1.5 px-3 py-2.5 rounded-lg" style={{
                                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.6) 0%, rgba(30, 41, 59, 0.4) 100%)',
                                border: '1px solid rgba(99, 102, 241, 0.15)'
                              }}>
                                {/* Players */}
                                <div className="mb-2.5">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] text-slate-300 flex items-center gap-1.5 font-medium">
                                      <span className="text-xs">⚽</span> Players
                                    </span>
                                    <span className="text-[10px] font-bold" style={{
                                      color: isPlayersLimitReached ? '#ef4444' : (user.usage && user.limits?.maxPlayers && user.limits.maxPlayers > 0 && (user.usage.totalPlayers / user.limits.maxPlayers > 0.8)) ? '#f59e0b' : '#10b981'
                                    }}>
                                      {user.usage?.totalPlayers || 0} / {user.limits?.maxPlayers === 0 ? '∞' : user.limits?.maxPlayers}
                                    </span>
                                  </div>
                                  {user.limits && user.limits.maxPlayers > 0 && (
                                    <div className="h-1 bg-slate-800/50 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                          width: `${Math.min(((user.usage?.totalPlayers || 0) / user.limits.maxPlayers) * 100, 100)}%`,
                                          background: isPlayersLimitReached 
                                            ? 'linear-gradient(90deg, #ef4444, #dc2626)' 
                                            : (user.usage && (user.usage.totalPlayers / user.limits.maxPlayers > 0.8)) 
                                            ? 'linear-gradient(90deg, #f59e0b, #d97706)' 
                                            : 'linear-gradient(90deg, #10b981, #059669)'
                                        }}
                                      ></div>
                                    </div>
                                  )}
                                </div>

                                {/* Teams */}
                                <div className="mb-2.5">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] text-slate-300 flex items-center gap-1.5 font-medium">
                                      <span className="text-xs">🏆</span> Teams
                                    </span>
                                    <span className="text-[10px] font-bold" style={{
                                      color: isTeamsLimitReached ? '#ef4444' : (user.usage && user.limits?.maxTeams && user.limits.maxTeams > 0 && (user.usage.totalTeams / user.limits.maxTeams > 0.8)) ? '#f59e0b' : '#10b981'
                                    }}>
                                      {user.usage?.totalTeams || 0} / {user.limits?.maxTeams === 0 ? '∞' : user.limits?.maxTeams}
                                    </span>
                                  </div>
                                  {user.limits && user.limits.maxTeams > 0 && (
                                    <div className="h-1 bg-slate-800/50 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                          width: `${Math.min(((user.usage?.totalTeams || 0) / user.limits.maxTeams) * 100, 100)}%`,
                                          background: isTeamsLimitReached 
                                            ? 'linear-gradient(90deg, #ef4444, #dc2626)' 
                                            : (user.usage && (user.usage.totalTeams / user.limits.maxTeams > 0.8)) 
                                            ? 'linear-gradient(90deg, #f59e0b, #d97706)' 
                                            : 'linear-gradient(90deg, #10b981, #059669)'
                                        }}
                                      ></div>
                                    </div>
                                  )}
                                </div>

                                {/* Access Expiry */}
                                <div className="pt-2 border-t border-slate-700/50">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-slate-300 flex items-center gap-1.5 font-medium">
                                      <span className="text-xs">📅</span> Access
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-300">
                                      {user.accessExpiry 
                                        ? `Expires ${new Date(user.accessExpiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` 
                                        : 'Unlimited'}
                                    </span>
                                  </div>
                                </div>

                                {/* Status Badge */}
                                {(isPlayersLimitReached || isTeamsLimitReached) && (
                                  <div className="mt-2 px-2 py-1.5 rounded" style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)'
                                  }}>
                                    <p className="text-[9px] text-red-400 flex items-center gap-1.5">
                                      <span>⚠️</span>
                                      <span>Limit reached! Contact admin.</span>
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <Link
                            to="/settings"
                            onClick={() => setShowUserMenu(false)}
                            className="group flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-300"
                            style={{ background: 'transparent' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(212, 175, 55, 0.12) 0%, rgba(212, 175, 55, 0.06) 100%)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '8px',
                              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.12) 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-semibold text-white">Settings</p>
                              <p className="text-[9px] text-slate-500">Branding & preferences</p>
                            </div>
                          </Link>
                        </>
                      )}
                      
                      <button
                        onClick={handleLogout}
                        className="w-full group flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-300 mt-1"
                        style={{ background: 'transparent' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.06) 100%)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.12) 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-semibold text-white">Sign Out</p>
                          <p className="text-[9px] text-slate-500">End your session</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation - Below header */}
        <div className="lg:hidden border-t" style={{
          borderColor: 'rgba(212, 175, 55, 0.2)',
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)'
        }}>
          <nav className="flex overflow-x-auto px-4 py-2 gap-2">
            {allNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onTouchStart={() => {
                    // Preload route on touch for instant navigation on mobile
                    preloadRoute(item.href);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 14px',
                    fontSize: '0.75rem',
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: isActive ? '#FFD700' : '#FFFFFF',
                    background: isActive 
                      ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(255, 215, 0, 0.1) 100%)'
                      : 'transparent',
                    border: isActive 
                      ? '1px solid rgba(212, 175, 55, 0.4)'
                      : '1px solid transparent',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                    transition: 'all 300ms'
                  }}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-3 px-4 flex-shrink-0" style={{
        borderColor: 'rgba(212, 175, 55, 0.2)',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(10px)'
      }}>
        <p className="text-center text-xs sm:text-sm" style={{
          color: 'rgba(160, 160, 165, 0.8)',
          fontFamily: "'Montserrat', sans-serif",
          letterSpacing: '0.05em'
        }}>
          © {new Date().getFullYear()} Sports Auction. All rights reserved.
        </p>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

export default Layout;