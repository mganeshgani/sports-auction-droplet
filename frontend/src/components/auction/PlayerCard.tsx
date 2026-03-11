import React, { memo, useMemo } from 'react';

interface EnabledField {
  fieldName: string;
  fieldLabel: string;
  fieldType?: string;
}

interface PlayerCardProps {
  player: {
    _id: string;
    name: string;
    regNo?: string;
    class?: string;
    position?: string;
    photoUrl?: string;
    customFields?: Record<string, any>;
    [key: string]: any;
  };
  soldAmount: number;
  setSoldAmount: (amount: number) => void;
  handleSoldClick: () => void;
  handleUnsoldClick: () => void;
  loading: boolean;
  isAuctioneer?: boolean;
  enabledFields?: EnabledField[];
  bidError?: string | null;
}

const getPositionColor = (position: string) => {
  const pos = (position || '').toLowerCase();
  if (pos === 'batsman') return { gradient: 'from-amber-400 to-orange-600', light: '#fbbf24', dark: '#ea580c' };
  if (pos === 'bowler') return { gradient: 'from-blue-400 to-indigo-600', light: '#60a5fa', dark: '#4f46e5' };
  if (pos === 'all-rounder') return { gradient: 'from-green-400 to-emerald-600', light: '#4ade80', dark: '#059669' };
  if (pos === 'wicket-keeper') return { gradient: 'from-purple-400 to-pink-600', light: '#c084fc', dark: '#db2777' };
  return { gradient: 'from-gray-400 to-gray-600', light: '#9ca3af', dark: '#4b5563' };
};

// Helper to get field value from player (handles both direct properties and customFields)
const getPlayerFieldValue = (player: any, fieldName: string): any => {
  // Check direct property first
  if (player[fieldName] !== undefined) {
    return player[fieldName];
  }
  // Check customFields
  if (player.customFields) {
    if (player.customFields instanceof Map) {
      return player.customFields.get(fieldName);
    }
    return player.customFields[fieldName];
  }
  return undefined;
};

const PlayerCard: React.FC<PlayerCardProps> = memo(({
  player,
  soldAmount,
  setSoldAmount,
  handleSoldClick,
  handleUnsoldClick,
  loading,
  isAuctioneer = true,
  enabledFields = [],
  bidError,
}) => {
  const positionColors = useMemo(() => getPositionColor(player.position || ''), [player.position]);
  const BACKEND_URL = process.env.REACT_APP_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5001';

  // Get field values for enabled fields only (includes isHighPriority flag)
  const fieldsToShow = useMemo(() => {
    return enabledFields
      .map(field => ({
        fieldName: field.fieldName,
        fieldLabel: field.fieldLabel,
        isHighPriority: (field as any).isHighPriority || false,
        value: getPlayerFieldValue(player, field.fieldName)
      }))
      .filter(f => f.value !== undefined && f.value !== null && f.value !== '');
  }, [enabledFields, player]);

  return (
    <div className="premium-player-card-wrapper">
      <style>{`
        /* ── Entrance ── */
        @keyframes cardReveal {
          0%   { opacity: 0; transform: perspective(800px) rotateY(-8deg) scale(0.92); filter: blur(12px); }
          60%  { opacity: 1; transform: perspective(800px) rotateY(2deg) scale(1.02); filter: blur(0); }
          100% { opacity: 1; transform: perspective(800px) rotateY(0) scale(1); filter: blur(0); }
        }
        @keyframes photoFloat {
          0%   { opacity: 0; transform: translateY(24px) scale(0.9); filter: blur(10px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes textSlide {
          0%   { opacity: 0; transform: translateX(-16px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes btnPop {
          0%   { opacity: 0; transform: translateY(12px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes borderPulse {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 0.8; }
        }
        @keyframes shimmerSweep {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(300%); }
        }
        @keyframes haloBreath {
          0%, 100% { box-shadow: 0 0 30px rgba(212,175,55,0.15), 0 8px 40px rgba(0,0,0,0.6); }
          50%      { box-shadow: 0 0 50px rgba(212,175,55,0.3),  0 12px 60px rgba(0,0,0,0.5); }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50%      { opacity: 0.7; transform: scale(1.4); }
        }

        .premium-player-card-wrapper {
          animation: cardReveal 0.8s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .pc-photo        { animation: photoFloat 0.7s ease-out 0.25s both; }
        .pc-name         { animation: textSlide  0.6s ease-out 0.5s both; }
        .pc-fields       { animation: textSlide  0.5s ease-out 0.65s both; }
        .pc-input        { animation: textSlide  0.5s ease-out 0.75s both; }
        .pc-btn-1        { animation: btnPop     0.5s cubic-bezier(0.34,1.56,0.64,1) 0.9s both; }
        .pc-btn-2        { animation: btnPop     0.5s cubic-bezier(0.34,1.56,0.64,1) 1.0s both; }
      `}</style>

      {/* OUTER WRAPPER — subtle glowing halo */}
      <div
        className="relative rounded-2xl sm:rounded-3xl overflow-hidden"
        style={{ animation: 'haloBreath 4s ease-in-out infinite' }}
      >
        {/* Animated gold border accent */}
        <div className="absolute inset-0 rounded-2xl sm:rounded-3xl pointer-events-none z-10"
          style={{
            border: '1.5px solid rgba(212,175,55,0.35)',
            animation: 'borderPulse 3s ease-in-out infinite'
          }}
        />

        {/* Shimmer sweep overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-2xl sm:rounded-3xl">
          <div className="absolute inset-0 opacity-[0.08]"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.6) 50%, transparent 60%)',
              animation: 'shimmerSweep 4s ease-in-out infinite'
            }}
          />
        </div>

        {/* Card body */}
        <div className="relative p-4 sm:p-6 lg:p-8" style={{
          background: 'linear-gradient(145deg, rgba(8,8,14,0.97) 0%, rgba(18,18,28,0.95) 40%, rgba(12,12,20,0.97) 100%)',
        }}>

          {/* Ambient tinted glow behind content */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-32 rounded-full pointer-events-none" style={{
            background: `radial-gradient(ellipse, ${positionColors.light}15 0%, transparent 70%)`,
            filter: 'blur(30px)'
          }}/>

          {/* Decorative corner dots */}
          <div className="absolute top-3 left-3 w-1 h-1 rounded-full bg-amber-400" style={{ animation: 'dotPulse 3s ease-in-out infinite' }}/>
          <div className="absolute top-3 right-3 w-1 h-1 rounded-full bg-amber-400" style={{ animation: 'dotPulse 3s ease-in-out 1.5s infinite' }}/>
          <div className="absolute bottom-3 left-3 w-1 h-1 rounded-full bg-amber-400" style={{ animation: 'dotPulse 3s ease-in-out 0.8s infinite' }}/>
          <div className="absolute bottom-3 right-3 w-1 h-1 rounded-full bg-amber-400" style={{ animation: 'dotPulse 3s ease-in-out 2.2s infinite' }}/>

          <div className="relative flex flex-col lg:flex-row gap-5 sm:gap-7 items-center lg:items-stretch">

            {/* ──── LEFT: Photo + field pills ──── */}
            <div className="flex flex-col items-center gap-4 flex-shrink-0">
              {/* Photo container with position-coloured ring */}
              <div className="pc-photo relative">
                {/* Outer glow ring */}
                <div className="absolute -inset-2 rounded-2xl sm:rounded-3xl" style={{
                  background: `linear-gradient(135deg, ${positionColors.light}30, transparent 60%, ${positionColors.dark}30)`,
                  filter: 'blur(8px)'
                }}/>
                {/* Image frame */}
                <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden" style={{
                  border: `2px solid ${positionColors.light}50`,
                  boxShadow: `0 8px 32px ${positionColors.light}20, inset 0 0 20px rgba(0,0,0,0.4)`
                }}>
                  <img
                    src={player.photoUrl ? (player.photoUrl.startsWith('http') ? player.photoUrl : `${BACKEND_URL}${player.photoUrl}`) : '/default-avatar.png'}
                    alt={player.name}
                    loading="lazy"
                    className="w-36 h-44 sm:w-44 sm:h-52 md:w-48 md:h-56 lg:w-52 lg:h-64 object-cover"
                  />
                  {/* Bottom gradient overlay for depth */}
                  <div className="absolute inset-x-0 bottom-0 h-1/3" style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)'
                  }}/>
                </div>
              </div>

              {/* Field pills below photo */}
              {fieldsToShow.length > 0 && (
                <div className="pc-fields flex flex-col gap-2 w-full">
                  {fieldsToShow.map((field) => (
                    <div
                      key={field.fieldName}
                      className="rounded-lg px-3 py-2 text-center transition-colors"
                      style={{
                        background: field.isHighPriority
                          ? 'linear-gradient(135deg, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0.06) 100%)'
                          : 'rgba(255,255,255,0.04)',
                        border: field.isHighPriority
                          ? '1px solid rgba(212,175,55,0.35)'
                          : '1px solid rgba(255,255,255,0.08)'
                      }}
                    >
                      <span className="text-[10px] uppercase tracking-wider block mb-0.5" style={{
                        color: field.isHighPriority ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.3)'
                      }}>{field.fieldLabel}</span>
                      <span className={`font-bold text-sm ${field.isHighPriority ? 'text-amber-300' : 'text-white'}`}>
                        {String(field.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ──── RIGHT: Name / Input / Buttons ──── */}
            <div className="flex-1 flex flex-col justify-center gap-5 sm:gap-6 w-full min-w-0">

              {/* Player Name */}
              <div className="pc-name text-center lg:text-left">
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] mb-1.5" style={{ color: `${positionColors.light}90` }}>
                  Now On The Block
                </p>
                <h1
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black leading-[1.1] pb-1"
                  style={{
                    background: `linear-gradient(135deg, #fff 0%, ${positionColors.light} 50%, #fff 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: `drop-shadow(0 2px 12px ${positionColors.light}40)`,
                    fontFamily: "'Georgia', serif"
                  }}
                >
                  {player.name}
                </h1>
                {/* Underline accent */}
                <div className="mt-2 flex items-center gap-1.5 justify-center lg:justify-start">
                  <div className="h-[2px] w-10 rounded-full" style={{ background: `linear-gradient(to right, ${positionColors.light}, transparent)` }}/>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: positionColors.light, opacity: 0.6 }}/>
                </div>
              </div>

              {/* Bid Amount Input */}
              <div className="pc-input">
                <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold mb-2" style={{ color: 'rgba(212,175,55,0.7)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Bid Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg sm:text-xl font-bold text-amber-400/50 pointer-events-none">₹</span>
                  <input
                    type="number"
                    value={soldAmount || ''}
                    onChange={(e) => setSoldAmount(Number(e.target.value))}
                    className="w-full pl-9 pr-4 py-3 sm:py-4 text-lg sm:text-2xl font-bold rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all duration-200"
                    placeholder="0"
                    disabled={loading}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${bidError ? 'rgba(239,68,68,0.6)' : 'rgba(212,175,55,0.2)'}`,
                      boxShadow: bidError ? '0 0 16px rgba(239,68,68,0.12)' : '0 0 16px rgba(0,0,0,0.3)',
                    }}
                    onFocus={(e) => { if (!bidError) { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.5)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(212,175,55,0.1)'; }}}
                    onBlur={(e) => { if (!bidError) { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(0,0,0,0.3)'; }}}
                  />
                </div>
                {bidError && (
                  <p className="mt-1.5 text-red-400 text-xs font-medium flex items-center gap-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {bidError}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              {isAuctioneer ? (
                <div className="flex gap-3 sm:gap-4 flex-col sm:flex-row">
                  {/* SOLD */}
                  <button
                    onClick={handleSoldClick}
                    disabled={loading}
                    className="pc-btn-1 group relative flex-1 py-3.5 sm:py-4 rounded-xl font-black text-sm sm:text-base tracking-[0.15em] overflow-hidden transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      boxShadow: '0 4px 20px rgba(5,150,105,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(5,150,105,0.4), inset 0 1px 0 rgba(255,255,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(5,150,105,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; }}
                  >
                    {/* Hover shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"/>
                    <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                      {loading ? (
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      ) : (
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                      )}
                      <span style={{ fontFamily: "'Georgia', serif" }}>{loading ? 'Processing...' : 'SOLD'}</span>
                    </span>
                  </button>

                  {/* UNSOLD */}
                  <button
                    onClick={handleUnsoldClick}
                    disabled={loading}
                    className="pc-btn-2 group relative flex-1 py-3.5 sm:py-4 rounded-xl font-black text-sm sm:text-base tracking-[0.15em] overflow-hidden transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      boxShadow: '0 4px 20px rgba(190,18,60,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(190,18,60,0.4), inset 0 1px 0 rgba(255,255,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(190,18,60,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"/>
                    <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                      {loading ? (
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      ) : (
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                      )}
                      <span style={{ fontFamily: "'Georgia', serif" }}>{loading ? 'Processing...' : 'UNSOLD'}</span>
                    </span>
                  </button>
                </div>
              ) : (
                <div className="px-4 py-3 rounded-lg text-center" style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)'
                }}>
                  <p className="text-slate-500 text-xs flex items-center justify-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    Viewer Mode — Watch Only
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

PlayerCard.displayName = 'PlayerCard';

export default PlayerCard;
