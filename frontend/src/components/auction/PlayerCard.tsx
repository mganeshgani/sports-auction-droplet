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
          0%   { opacity: 0; transform: perspective(1000px) rotateY(-8deg) scale(0.9); filter: blur(12px); }
          50%  { opacity: 1; transform: perspective(1000px) rotateY(2deg) scale(1.02); filter: blur(0); }
          100% { opacity: 1; transform: perspective(1000px) rotateY(0) scale(1); filter: blur(0); }
        }
        @keyframes photoReveal {
          0%   { opacity: 0; transform: translateY(30px) scale(0.88); filter: blur(14px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes contentSlide {
          0%   { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes tagReveal {
          0%   { opacity: 0; transform: translateX(-10px) scale(0.85); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes btnReveal {
          0%   { opacity: 0; transform: translateY(14px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes haloBreath {
          0%, 100% { box-shadow: 0 0 70px rgba(201,168,76,0.2), 0 0 140px rgba(201,168,76,0.08), 0 30px 100px rgba(0,0,0,0.7); }
          50%      { box-shadow: 0 0 120px rgba(201,168,76,0.35), 0 0 200px rgba(201,168,76,0.14), 0 30px 100px rgba(0,0,0,0.5); }
        }
        @keyframes borderGlow {
          0%, 100% { opacity: 0.25; }
          50%      { opacity: 0.65; }
        }
        @keyframes shimmerSweep {
          0%   { transform: translateX(-150%) skewX(-12deg); }
          100% { transform: translateX(350%) skewX(-12deg); }
        }
        @keyframes edgeTrace {
          0%   { transform: translateX(-200%); }
          100% { transform: translateX(400%); }
        }
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          33%      { transform: translate(50px, -30px) scale(1.2); opacity: 0.6; }
          66%      { transform: translate(20px, -50px) scale(1.1); opacity: 0.5; }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          50%      { transform: translate(-35px, 25px) scale(1.3); opacity: 0.55; }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          50%      { transform: translate(25px, 35px) scale(1.15); opacity: 0.4; }
        }
        @keyframes photoGlow {
          0%, 100% { box-shadow: 0 16px 50px rgba(0,0,0,0.5), 0 0 50px ${positionColors.light}25, 0 0 100px ${positionColors.light}10; }
          50%      { box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 80px ${positionColors.light}38, 0 0 140px ${positionColors.light}18; }
        }
        @keyframes floatingRing {
          0%   { transform: rotate(0deg) scale(1); opacity: 0.15; }
          50%  { transform: rotate(180deg) scale(1.08); opacity: 0.3; }
          100% { transform: rotate(360deg) scale(1); opacity: 0.15; }
        }
        @keyframes starFloat {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.2; }
          25%  { transform: translateY(-15px) rotate(90deg); opacity: 0.5; }
          50%  { transform: translateY(-5px) rotate(180deg); opacity: 0.3; }
          75%  { transform: translateY(-20px) rotate(270deg); opacity: 0.6; }
        }
        @keyframes cometTrail {
          0%   { transform: translate(-100%, -100%) rotate(45deg); opacity: 0; }
          10%  { opacity: 0.7; }
          100% { transform: translate(300%, 300%) rotate(45deg); opacity: 0; }
        }
        @keyframes particleDrift {
          0%   { transform: translateY(0) translateX(0) scale(0); opacity: 0; }
          20%  { transform: translateY(-10px) translateX(5px) scale(1); opacity: 0.6; }
          80%  { transform: translateY(-40px) translateX(-8px) scale(0.8); opacity: 0.3; }
          100% { transform: translateY(-60px) translateX(3px) scale(0); opacity: 0; }
        }
        @keyframes soldBtnGlow {
          0%, 100% { box-shadow: 0 8px 32px rgba(16,185,129,0.3), 0 0 60px rgba(16,185,129,0.08), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.15); }
          50%      { box-shadow: 0 8px 40px rgba(16,185,129,0.4), 0 0 80px rgba(16,185,129,0.12), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.15); }
        }

        .premium-player-card-wrapper { animation: cardReveal 1s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .pc-photo    { animation: photoReveal  0.8s ease-out 0.2s both; }
        .pc-content  { animation: contentSlide 0.6s ease-out 0.5s both; }
        .pc-tags     { animation: contentSlide 0.5s ease-out 0.6s both; }
        .pc-input    { animation: contentSlide 0.5s ease-out 0.7s both; }
        .pc-btn-1    { animation: btnReveal    0.5s cubic-bezier(0.34,1.56,0.64,1) 0.9s both; }
        .pc-btn-2    { animation: btnReveal    0.5s cubic-bezier(0.34,1.56,0.64,1) 1.0s both; }
      `}</style>

      {/* CARD SHELL — breathing golden halo */}
      <div className="relative rounded-[22px] sm:rounded-[28px] overflow-hidden"
        style={{ animation: 'haloBreath 4s ease-in-out infinite' }}>

        {/* Pulsing gold border */}
        <div className="absolute inset-0 rounded-[22px] sm:rounded-[28px] pointer-events-none z-20"
          style={{ border: '1px solid rgba(201,168,76,0.3)', animation: 'borderGlow 3s ease-in-out infinite' }} />

        {/* Edge shimmer traces — all 4 sides */}
        <div className="absolute top-0 inset-x-0 h-[1px] z-20 overflow-hidden">
          <div className="h-full w-1/4 opacity-60" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.9), transparent)', animation: 'edgeTrace 4s ease-in-out infinite' }} />
        </div>
        <div className="absolute bottom-0 inset-x-0 h-[1px] z-20 overflow-hidden">
          <div className="h-full w-1/4 opacity-25" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.7), transparent)', animation: 'edgeTrace 4s ease-in-out 2s infinite' }} />
        </div>
        <div className="absolute left-0 inset-y-0 w-[1px] z-20 overflow-hidden">
          <div className="w-full h-1/4 opacity-25" style={{ background: 'linear-gradient(180deg, transparent, rgba(201,168,76,0.7), transparent)', animation: 'edgeTrace 5s ease-in-out 1s infinite' }} />
        </div>
        <div className="absolute right-0 inset-y-0 w-[1px] z-20 overflow-hidden">
          <div className="w-full h-1/4 opacity-25" style={{ background: 'linear-gradient(180deg, transparent, rgba(201,168,76,0.7), transparent)', animation: 'edgeTrace 5s ease-in-out 3s infinite' }} />
        </div>

        {/* ── ANIMATED MESH GRADIENT BACKGROUND ── */}
        <div className="absolute inset-0" style={{ background: '#060610' }}>
          {/* Orb 1 — top-right warm gold */}
          <div className="absolute -top-24 -right-24 w-[30rem] h-[30rem] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.55) 0%, rgba(201,168,76,0.12) 40%, transparent 70%)', filter: 'blur(45px)', animation: 'orbFloat1 8s ease-in-out infinite' }} />
          {/* Orb 2 — bottom-left position color */}
          <div className="absolute -bottom-28 -left-28 w-[34rem] h-[34rem] rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${positionColors.light}45 0%, ${positionColors.dark}18 40%, transparent 70%)`, filter: 'blur(55px)', animation: 'orbFloat2 10s ease-in-out infinite' }} />
          {/* Orb 3 — center deep violet */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[38rem] h-[38rem] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(100,70,180,0.22) 0%, rgba(60,40,130,0.08) 40%, transparent 70%)', filter: 'blur(65px)', animation: 'orbFloat3 12s ease-in-out infinite' }} />
          {/* Orb 4 — top-left warm bleed */}
          <div className="absolute -top-12 -left-12 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(234,179,8,0.16) 0%, transparent 60%)', filter: 'blur(35px)', animation: 'orbFloat3 14s ease-in-out 2s infinite' }} />
          {/* Orb 5 — center-right emerald pulse */}
          <div className="absolute top-1/3 -right-16 w-[22rem] h-[22rem] rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 60%)', filter: 'blur(50px)', animation: 'orbFloat1 16s ease-in-out 3s infinite' }} />
          {/* Noise grain texture */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat', backgroundSize: '128px 128px'
          }}/>
        </div>

        {/* Full-card shimmer sweep */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-[22px] sm:rounded-[28px]">
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ background: 'linear-gradient(110deg, transparent 38%, rgba(255,255,255,0.8) 50%, transparent 62%)', animation: 'shimmerSweep 5s ease-in-out infinite' }} />
        </div>

        {/* Floating particles */}
        <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 rounded-full bg-amber-400/50 z-10 pointer-events-none" style={{ animation: 'particleDrift 4s ease-out infinite' }} />
        <div className="absolute top-1/3 right-1/3 w-1 h-1 rounded-full bg-amber-300/40 z-10 pointer-events-none" style={{ animation: 'particleDrift 5s ease-out 1.5s infinite' }} />
        <div className="absolute bottom-1/3 right-1/4 w-1.5 h-1.5 rounded-full bg-amber-400/40 z-10 pointer-events-none" style={{ animation: 'particleDrift 6s ease-out 3s infinite' }} />
        <div className="absolute top-[15%] right-[15%] w-1 h-1 rounded-full bg-yellow-300/30 z-10 pointer-events-none" style={{ animation: 'particleDrift 7s ease-out 0.5s infinite' }} />
        <div className="absolute bottom-[20%] left-[35%] w-1 h-1 rounded-full bg-amber-200/30 z-10 pointer-events-none" style={{ animation: 'particleDrift 5.5s ease-out 2.5s infinite' }} />

        {/* Moving stars */}
        <div className="absolute top-[10%] left-[60%] w-2 h-2 z-10 pointer-events-none" style={{ animation: 'starFloat 6s ease-in-out infinite' }}>
          <svg viewBox="0 0 24 24" fill="rgba(201,168,76,0.3)" className="w-full h-full"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
        </div>
        <div className="absolute bottom-[15%] right-[10%] w-1.5 h-1.5 z-10 pointer-events-none" style={{ animation: 'starFloat 8s ease-in-out 2s infinite' }}>
          <svg viewBox="0 0 24 24" fill="rgba(201,168,76,0.25)" className="w-full h-full"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
        </div>
        <div className="absolute top-[45%] left-[8%] w-1.5 h-1.5 z-10 pointer-events-none" style={{ animation: 'starFloat 7s ease-in-out 4s infinite' }}>
          <svg viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)" className="w-full h-full"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
        </div>

        {/* Comet trail */}
        <div className="absolute top-0 left-0 w-20 h-[2px] z-10 pointer-events-none overflow-visible" style={{ animation: 'cometTrail 8s ease-in 3s infinite' }}>
          <div className="h-full w-full rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.6), rgba(201,168,76,0.1))' }}/>
        </div>

        {/* Floating ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] rounded-full z-[5] pointer-events-none" style={{ border: '1px solid rgba(201,168,76,0.06)', animation: 'floatingRing 20s linear infinite' }} />

        {/* CARD CONTENT */}
        <div className="relative z-10 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row gap-7 sm:gap-9 items-center lg:items-stretch">

            {/* ── LEFT: Photo Only ── */}
            <div className="pc-photo relative flex-shrink-0">
              {/* Multi-layer glow behind photo */}
              <div className="absolute -inset-6 rounded-[26px]" style={{
                background: `conic-gradient(from 200deg, ${positionColors.light}35, rgba(201,168,76,0.3), ${positionColors.dark}25, rgba(201,168,76,0.35), ${positionColors.light}35)`,
                filter: 'blur(22px)',
                animation: 'borderGlow 3.5s ease-in-out infinite',
              }}/>
              {/* Gradient border frame */}
              <div className="absolute -inset-[2px] rounded-[22px]" style={{
                background: `linear-gradient(160deg, ${positionColors.light}40, rgba(201,168,76,0.35), ${positionColors.dark}30, rgba(201,168,76,0.4))`,
              }}/>
              <div className="relative rounded-[20px] overflow-hidden" style={{
                animation: 'photoGlow 4s ease-in-out infinite',
              }}>
                <img
                  src={player.photoUrl ? (player.photoUrl.startsWith('http') ? player.photoUrl : `${BACKEND_URL}${player.photoUrl}`) : '/default-avatar.png'}
                  alt={player.name}
                  loading="lazy"
                  className="w-48 h-56 sm:w-56 sm:h-[17rem] md:w-60 md:h-[18rem] lg:w-64 lg:h-[20rem] object-cover"
                />
              </div>
            </div>

            {/* ── RIGHT: Name + Tags + Input + Buttons ── */}
            <div className="flex-1 flex flex-col justify-center gap-4 sm:gap-5 w-full min-w-0">

              {/* Player Name */}
              <div className="pc-content text-center lg:text-left overflow-hidden">
                <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] lg:text-[3rem] font-black leading-[1.1] tracking-tight break-words"
                  style={{
                    background: 'linear-gradient(140deg, #ffffff 0%, #f0e4c8 25%, #c9a84c 50%, #f5e6b8 75%, #ffffff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 3px 16px rgba(201,168,76,0.35))',
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    wordBreak: 'break-word'
                  }}>
                  {player.name}
                </h1>
              </div>

              {/* Field Tags — values only as clean pills under name */}
              {fieldsToShow.length > 0 && (
                <div className="pc-tags flex flex-wrap gap-2.5 justify-center lg:justify-start">
                  {fieldsToShow.map((field, i) => (
                    <span
                      key={field.fieldName}
                      className="inline-flex items-center rounded-full font-semibold uppercase"
                      style={{
                        padding: '7px 20px',
                        fontSize: '0.8rem',
                        letterSpacing: '0.08em',
                        background: field.isHighPriority
                          ? 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.06))'
                          : 'rgba(255,255,255,0.05)',
                        border: field.isHighPriority
                          ? '1px solid rgba(201,168,76,0.35)'
                          : '1px solid rgba(255,255,255,0.08)',
                        color: field.isHighPriority ? '#d4b85a' : 'rgba(255,255,255,0.6)',
                        animation: `tagReveal 0.4s ease-out ${0.65 + i * 0.1}s both`,
                        boxShadow: field.isHighPriority ? '0 0 20px rgba(201,168,76,0.06)' : 'none'
                      }}>
                      {String(field.value)}
                    </span>
                  ))}
                </div>
              )}

              {/* Separator */}
              <div className="flex items-center gap-2.5 pc-content" style={{ animationDelay: '0.6s' }}>
                <div className="h-[1px] w-14" style={{ background: 'linear-gradient(to right, rgba(201,168,76,0.4), rgba(201,168,76,0.12))' }}/>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(201,168,76,0.35)' }}/>
                <div className="h-[1px] flex-1" style={{ background: 'linear-gradient(to right, rgba(201,168,76,0.12), transparent)' }}/>
              </div>

              {/* Bid Input */}
              <div className="pc-input">
                <label className="text-[11px] sm:text-xs font-medium uppercase tracking-[0.15em] mb-2.5 block"
                  style={{ color: 'rgba(201,168,76,0.5)' }}>
                  Bid Amount
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl sm:text-2xl font-bold pointer-events-none"
                    style={{ color: 'rgba(201,168,76,0.28)' }}>₹</span>
                  <input
                    type="number"
                    value={soldAmount || ''}
                    onChange={(e) => setSoldAmount(Number(e.target.value))}
                    className="w-full pl-12 pr-5 py-3.5 sm:py-4 text-2xl sm:text-3xl font-bold rounded-2xl text-white placeholder-white/10 focus:outline-none transition-all duration-300"
                    placeholder="0"
                    disabled={loading}
                    style={{
                      background: 'rgba(255,255,255,0.025)',
                      border: `1.5px solid ${bidError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.07)'}`,
                      boxShadow: bidError ? '0 0 24px rgba(239,68,68,0.08)' : 'inset 0 2px 8px rgba(0,0,0,0.25)',
                    }}
                    onFocus={(e) => { if (!bidError) { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,168,76,0.08), 0 0 30px rgba(201,168,76,0.05), inset 0 2px 8px rgba(0,0,0,0.25)'; }}}
                    onBlur={(e) => { if (!bidError) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = 'inset 0 2px 8px rgba(0,0,0,0.25)'; }}}
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
                  {/* SOLD — primary, emerald with gold accents */}
                  <button
                    onClick={handleSoldClick}
                    disabled={loading}
                    className="pc-btn-1 group relative flex-1 py-[18px] sm:py-5 rounded-2xl font-black text-[13px] sm:text-[15px] tracking-[0.2em] uppercase overflow-hidden transition-all duration-500 hover:-translate-y-[3px] active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(160deg, #10b981 0%, #059669 45%, #047857 100%)',
                      animation: 'soldBtnGlow 3s ease-in-out infinite',
                      border: 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 16px 56px rgba(16,185,129,0.45), 0 0 100px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; }}
                  >
                    {/* Inner light layer */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent rounded-2xl pointer-events-none"/>
                    {/* Hover shimmer */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden">
                      <div className="absolute inset-0 w-1/2" style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)', animation: 'shimmerSweep 2s ease-in-out infinite' }}/>
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

                  {/* UNSOLD — ghost button, reveals red on hover */}
                  <button
                    onClick={handleUnsoldClick}
                    disabled={loading}
                    className="pc-btn-2 group relative flex-1 py-[18px] sm:py-5 rounded-2xl font-black text-[13px] sm:text-[15px] tracking-[0.2em] uppercase overflow-hidden transition-all duration-500 hover:-translate-y-[3px] active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2), 0 6px 24px rgba(0,0,0,0.35)',
                      border: '1.5px solid rgba(255,255,255,0.1)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; e.currentTarget.style.background = 'linear-gradient(160deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.04) 100%)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(239,68,68,0.2), 0 0 60px rgba(239,68,68,0.06), inset 0 1px 0 rgba(255,255,255,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2), 0 6px 24px rgba(0,0,0,0.35)'; }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2.5 text-white/60 group-hover:text-red-300 transition-colors duration-300">
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
                <div className="py-3.5 px-5 rounded-xl text-center" style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <p className="text-white/25 text-xs tracking-[0.15em] uppercase flex items-center justify-center gap-1.5">
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
