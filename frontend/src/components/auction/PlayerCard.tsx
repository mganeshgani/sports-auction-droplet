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
        @keyframes cardReveal {
          0%   { opacity: 0; transform: perspective(900px) rotateY(-6deg) scale(0.94); filter: blur(8px); }
          60%  { opacity: 1; transform: perspective(900px) rotateY(1.5deg) scale(1.01); filter: blur(0); }
          100% { opacity: 1; transform: perspective(900px) rotateY(0) scale(1); filter: blur(0); }
        }
        @keyframes photoFloat {
          0%   { opacity: 0; transform: translateY(20px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes contentSlide {
          0%   { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes btnReveal {
          0%   { opacity: 0; transform: translateY(10px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmerSweep {
          0%   { transform: translateX(-150%) skewX(-15deg); }
          100% { transform: translateX(350%) skewX(-15deg); }
        }
        @keyframes meshFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          50%      { transform: translate(40px, -25px) scale(1.2); opacity: 0.65; }
        }
        @keyframes meshFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          50%      { transform: translate(-30px, 20px) scale(1.25); opacity: 0.55; }
        }
        @keyframes meshFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.25; }
          50%      { transform: translate(20px, 30px) scale(1.15); opacity: 0.45; }
        }
        @keyframes meshFloat4 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.15; }
          50%      { transform: translate(-15px, -20px) scale(1.1); opacity: 0.35; }
        }
        @keyframes tagSlide {
          0%   { opacity: 0; transform: translateX(-8px) scale(0.9); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes haloBreath {
          0%, 100% { box-shadow: 0 0 40px rgba(201,168,76,0.12), 0 0 80px rgba(201,168,76,0.06), 0 30px 90px rgba(0,0,0,0.7); }
          50%      { box-shadow: 0 0 60px rgba(201,168,76,0.22), 0 0 120px rgba(201,168,76,0.1), 0 30px 90px rgba(0,0,0,0.6); }
        }
        @keyframes borderGlow {
          0%, 100% { opacity: 0.3; }
          50%      { opacity: 0.7; }
        }
        @keyframes photoGlow {
          0%, 100% { box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 30px ${positionColors.light}15; }
          50%      { box-shadow: 0 16px 50px rgba(0,0,0,0.4), 0 0 50px ${positionColors.light}25; }
        }
        @keyframes edgeShimmer {
          0%   { transform: translateX(-200%); }
          100% { transform: translateX(400%); }
        }

        .premium-player-card-wrapper { animation: cardReveal 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .pc-photo    { animation: photoFloat   0.7s ease-out 0.2s both; }
        .pc-content  { animation: contentSlide 0.6s ease-out 0.45s both; }
        .pc-tags     { animation: contentSlide 0.5s ease-out 0.55s both; }
        .pc-input    { animation: contentSlide 0.5s ease-out 0.65s both; }
        .pc-btn-1    { animation: btnReveal    0.5s cubic-bezier(0.34,1.56,0.64,1) 0.85s both; }
        .pc-btn-2    { animation: btnReveal    0.5s cubic-bezier(0.34,1.56,0.64,1) 0.95s both; }
      `}</style>

      {/* CARD SHELL — breathing golden halo */}
      <div className="relative rounded-[20px] sm:rounded-[28px] overflow-hidden"
        style={{ animation: 'haloBreath 4s ease-in-out infinite' }}>

        {/* Animated gold border ring */}
        <div className="absolute inset-0 rounded-[20px] sm:rounded-[28px] pointer-events-none z-20"
          style={{ border: '1px solid rgba(201,168,76,0.25)', animation: 'borderGlow 3s ease-in-out infinite' }} />

        {/* Outer shimmer lines — top + bottom edges */}
        <div className="absolute top-0 inset-x-0 h-[1px] z-20 overflow-hidden">
          <div className="h-full w-1/4 opacity-50"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.9), transparent)', animation: 'edgeShimmer 4s ease-in-out infinite' }} />
        </div>
        <div className="absolute bottom-0 inset-x-0 h-[1px] z-20 overflow-hidden">
          <div className="h-full w-1/4 opacity-30"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent)', animation: 'edgeShimmer 4s ease-in-out 2s infinite' }} />
        </div>
        {/* Left + right edge shimmer */}
        <div className="absolute left-0 inset-y-0 w-[1px] z-20 overflow-hidden">
          <div className="w-full h-1/4 opacity-30"
            style={{ background: 'linear-gradient(180deg, transparent, rgba(201,168,76,0.6), transparent)', animation: 'edgeShimmer 5s ease-in-out 1s infinite' }} />
        </div>
        <div className="absolute right-0 inset-y-0 w-[1px] z-20 overflow-hidden">
          <div className="w-full h-1/4 opacity-30"
            style={{ background: 'linear-gradient(180deg, transparent, rgba(201,168,76,0.6), transparent)', animation: 'edgeShimmer 5s ease-in-out 3s infinite' }} />
        </div>

        {/* ── RICH MESH GRADIENT BACKGROUND ── */}
        <div className="absolute inset-0" style={{ background: '#06060c' }}>
          {/* Orb 1 — top-right warm gold */}
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.35) 0%, rgba(201,168,76,0.08) 40%, transparent 70%)', filter: 'blur(50px)', animation: 'meshFloat1 7s ease-in-out infinite' }} />
          {/* Orb 2 — bottom-left position color */}
          <div className="absolute -bottom-24 -left-24 w-[28rem] h-[28rem] rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${positionColors.light}30 0%, ${positionColors.dark}10 40%, transparent 70%)`, filter: 'blur(60px)', animation: 'meshFloat2 9s ease-in-out infinite' }} />
          {/* Orb 3 — center deep violet */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(100,80,160,0.15) 0%, rgba(60,40,120,0.05) 40%, transparent 70%)', filter: 'blur(70px)', animation: 'meshFloat3 11s ease-in-out infinite' }} />
          {/* Orb 4 — top-left warm amber bleed */}
          <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(234,179,8,0.12) 0%, transparent 60%)', filter: 'blur(45px)', animation: 'meshFloat4 13s ease-in-out infinite' }} />
          {/* Noise grain */}
          <div className="absolute inset-0 opacity-[0.035]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat', backgroundSize: '128px 128px'
          }}/>
        </div>

        {/* Full card shimmer sweep */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-[20px] sm:rounded-[28px]">
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ background: 'linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.7) 50%, transparent 60%)', animation: 'shimmerSweep 5s ease-in-out infinite' }} />
        </div>

        {/* CARD CONTENT */}
        <div className="relative z-10 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row gap-7 sm:gap-9 items-center lg:items-stretch">

            {/* ── LEFT: Photo ── */}
            <div className="pc-photo relative flex-shrink-0">
              {/* Multi-layer glow behind photo */}
              <div className="absolute -inset-4 rounded-[22px]" style={{
                background: `conic-gradient(from 180deg, ${positionColors.light}20, rgba(201,168,76,0.15), ${positionColors.dark}15, rgba(201,168,76,0.2), ${positionColors.light}20)`,
                filter: 'blur(16px)',
                animation: 'borderGlow 3s ease-in-out infinite',
              }}/>
              <div className="absolute -inset-[2px] rounded-[20px]" style={{
                background: `linear-gradient(160deg, ${positionColors.light}35, rgba(201,168,76,0.3), ${positionColors.dark}25)`,
                borderRadius: '20px',
              }}/>
              <div className="relative rounded-[18px] sm:rounded-[20px] overflow-hidden" style={{
                animation: 'photoGlow 4s ease-in-out infinite',
              }}>
                <img
                  src={player.photoUrl ? (player.photoUrl.startsWith('http') ? player.photoUrl : `${BACKEND_URL}${player.photoUrl}`) : '/default-avatar.png'}
                  alt={player.name}
                  loading="lazy"
                  className="w-44 h-52 sm:w-52 sm:h-60 md:w-56 md:h-[17rem] lg:w-60 lg:h-[19rem] object-cover"
                />
                {/* Photo bottom fade */}
                <div className="absolute inset-x-0 bottom-0 h-1/3"
                  style={{ background: 'linear-gradient(to top, rgba(6,6,12,0.85), transparent)' }} />
              </div>
            </div>

            {/* ── RIGHT: Info Section ── */}
            <div className="flex-1 flex flex-col justify-center gap-5 sm:gap-6 w-full min-w-0">

              {/* Player Name */}
              <div className="pc-content text-center lg:text-left">
                <h1 className="text-4xl sm:text-[2.75rem] md:text-5xl lg:text-[3.25rem] font-black leading-[1.08] tracking-tight"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #e8dcc8 35%, #c9a84c 60%, #f5e6b8 80%, #ffffff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 12px rgba(201,168,76,0.3))',
                    fontFamily: "'Georgia', 'Times New Roman', serif"
                  }}>
                  {player.name}
                </h1>
              </div>

              {/* Field Tags — values only, no labels */}
              {fieldsToShow.length > 0 && (
                <div className="pc-tags flex flex-wrap gap-2.5 justify-center lg:justify-start">
                  {fieldsToShow.map((field, i) => (
                    <span
                      key={field.fieldName}
                      className="inline-flex items-center rounded-full text-xs sm:text-sm font-semibold uppercase tracking-wide"
                      style={{
                        padding: '7px 18px',
                        background: field.isHighPriority
                          ? 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.08))'
                          : 'rgba(255,255,255,0.05)',
                        border: field.isHighPriority
                          ? '1px solid rgba(201,168,76,0.35)'
                          : '1px solid rgba(255,255,255,0.08)',
                        color: field.isHighPriority ? '#d4b85a' : 'rgba(255,255,255,0.65)',
                        animation: `tagSlide 0.4s ease-out ${0.6 + i * 0.08}s both`,
                        letterSpacing: '0.06em',
                        boxShadow: field.isHighPriority ? '0 0 16px rgba(201,168,76,0.08)' : 'none'
                      }}>
                      {String(field.value)}
                    </span>
                  ))}
                </div>
              )}

              {/* Separator */}
              <div className="hidden lg:flex items-center gap-2.5 pc-content" style={{ animationDelay: '0.55s' }}>
                <div className="h-[1px] w-12" style={{ background: 'linear-gradient(to right, rgba(201,168,76,0.4), rgba(201,168,76,0.15))' }}/>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(201,168,76,0.3)' }}/>
                <div className="h-[1px] flex-1" style={{ background: 'linear-gradient(to right, rgba(201,168,76,0.15), transparent)' }}/>
              </div>

              {/* Bid Input */}
              <div className="pc-input">
                <label className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium uppercase tracking-[0.12em] mb-2.5"
                  style={{ color: 'rgba(201,168,76,0.55)' }}>
                  Bid Amount
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl sm:text-2xl font-bold pointer-events-none"
                    style={{ color: 'rgba(201,168,76,0.3)' }}>₹</span>
                  <input
                    type="number"
                    value={soldAmount || ''}
                    onChange={(e) => setSoldAmount(Number(e.target.value))}
                    className="w-full pl-12 pr-5 py-3.5 sm:py-4 text-2xl sm:text-3xl font-bold rounded-xl text-white placeholder-white/15 focus:outline-none transition-all duration-300"
                    placeholder="0"
                    disabled={loading}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${bidError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      boxShadow: bidError ? '0 0 20px rgba(239,68,68,0.1)' : 'inset 0 2px 6px rgba(0,0,0,0.2)',
                    }}
                    onFocus={(e) => { if (!bidError) { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.1), 0 0 20px rgba(201,168,76,0.06), inset 0 2px 6px rgba(0,0,0,0.2)'; }}}
                    onBlur={(e) => { if (!bidError) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'inset 0 2px 6px rgba(0,0,0,0.2)'; }}}
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
                <div className="flex gap-3.5 sm:gap-4 flex-col sm:flex-row">
                  {/* SOLD */}
                  <button
                    onClick={handleSoldClick}
                    disabled={loading}
                    className="pc-btn-1 group relative flex-1 py-4.5 sm:py-5 rounded-2xl font-black text-sm sm:text-[15px] tracking-[0.18em] uppercase overflow-hidden transition-all duration-500 hover:-translate-y-[3px] active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(160deg, #10b981 0%, #059669 40%, #047857 100%)',
                      boxShadow: '0 8px 32px rgba(16,185,129,0.3), 0 0 60px rgba(16,185,129,0.1), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.15)',
                      border: 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 14px 48px rgba(16,185,129,0.4), 0 0 80px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -2px 0 rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(16,185,129,0.3), 0 0 60px rgba(16,185,129,0.1), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.15)'; }}
                  >
                    {/* Shimmer */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden">
                      <div className="absolute inset-0 w-1/2" style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)', animation: 'shimmerSweep 2s ease-in-out infinite' }}/>
                    </div>
                    <span className="relative z-10 flex items-center justify-center gap-2.5 text-white">
                      {loading ? (
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      ) : (
                        <svg className="w-[18px] h-[18px] transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      )}
                      <span style={{ fontFamily: "'Georgia', serif", textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>{loading ? 'Processing...' : 'Sold'}</span>
                    </span>
                  </button>

                  {/* UNSOLD */}
                  <button
                    onClick={handleUnsoldClick}
                    disabled={loading}
                    className="pc-btn-2 group relative flex-1 py-4.5 sm:py-5 rounded-2xl font-black text-sm sm:text-[15px] tracking-[0.18em] uppercase overflow-hidden transition-all duration-500 hover:-translate-y-[3px] active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(160deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.3)',
                      border: '1.5px solid rgba(255,255,255,0.1)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.45)'; e.currentTarget.style.background = 'linear-gradient(160deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.05) 100%)'; e.currentTarget.style.boxShadow = '0 10px 36px rgba(239,68,68,0.18), 0 0 40px rgba(239,68,68,0.06), inset 0 1px 0 rgba(255,255,255,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'linear-gradient(160deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.3)'; }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2.5 text-white/70 group-hover:text-red-300 transition-colors duration-300">
                      {loading ? (
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      ) : (
                        <svg className="w-[18px] h-[18px] transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      )}
                      <span style={{ fontFamily: "'Georgia', serif" }}>{loading ? 'Processing...' : 'Unsold'}</span>
                    </span>
                  </button>
                </div>
              ) : (
                <div className="py-3 px-4 rounded-xl text-center" style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <p className="text-white/30 text-xs tracking-wider uppercase flex items-center justify-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    Viewer Mode
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
