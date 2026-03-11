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
    <div className="pc-entrance">
      <style>{`
        /* ═══════════════════════════════════════════
           DESIGN PHILOSOPHY — Hermès / Apple / Rolex
           ─ Deep black canvas (#08080f)
           ─ Position-dynamic accent colors (batsman=amber, bowler=blue, all-rounder=green, wk=purple)
           ─ Monochromatic restraint: one accent per position, generous space
           ─ Slow, intentional motion (6-20s cycles)
           ─ Typography: Georgia serif, large, breathing
           ═══════════════════════════════════════════ */

        /* ── Entrance Choreography (runs once) ── */
        @keyframes enterCard {
          0%   { opacity: 0; transform: scale(0.92) translateY(20px); filter: blur(16px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes enterPhoto {
          0%   { opacity: 0; transform: scale(0.88); filter: blur(12px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes enterContent {
          0%   { opacity: 0; transform: translateY(14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes enterBtn {
          0%   { opacity: 0; transform: translateY(10px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* ── Living Background: Liquid Aurora ── */
        @keyframes liquidA {
          0%   { transform: translate(0%, 0%) scale(1); }
          33%  { transform: translate(8%, -12%) scale(1.15); }
          66%  { transform: translate(-5%, 8%) scale(1.05); }
          100% { transform: translate(0%, 0%) scale(1); }
        }
        @keyframes liquidB {
          0%   { transform: translate(0%, 0%) scale(1.1); }
          50%  { transform: translate(-10%, 6%) scale(1.25); }
          100% { transform: translate(0%, 0%) scale(1.1); }
        }

        /* ── Card Atmosphere ── */
        @keyframes breathe {
          0%, 100% { box-shadow: 0 0 60px ${positionColors.light}18, 0 25px 80px rgba(0,0,0,0.6); }
          50%      { box-shadow: 0 0 100px ${positionColors.light}28, 0 30px 100px rgba(0,0,0,0.5); }
        }
        @keyframes borderPulse {
          0%, 100% { opacity: 0.2; }
          50%      { opacity: 0.5; }
        }

        /* ── Moving Light Sweep (left → right) ── */
        @keyframes sweepGlow {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        /* ── Photo Presence ── */
        @keyframes photoAura {
          0%, 100% { box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${positionColors.light}15; }
          50%      { box-shadow: 0 24px 70px rgba(0,0,0,0.5), 0 0 70px ${positionColors.light}25; }
        }

        /* ── Sold Button ── */
        @keyframes soldGlow {
          0%, 100% { box-shadow: 0 6px 28px rgba(16,185,129,0.25), inset 0 1px 0 rgba(255,255,255,0.12); }
          50%      { box-shadow: 0 8px 36px rgba(16,185,129,0.35), inset 0 1px 0 rgba(255,255,255,0.12); }
        }

        /* ── Light Trace ── */
        @keyframes traceTop {
          0%   { left: -20%; }
          100% { left: 120%; }
        }

        .pc-entrance  { animation: enterCard 0.9s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .pc-photo-w   { animation: enterPhoto 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both; }
        .pc-ct-1      { animation: enterContent 0.6s ease-out 0.35s both; }
        .pc-ct-2      { animation: enterContent 0.5s ease-out 0.45s both; }
        .pc-ct-3      { animation: enterContent 0.5s ease-out 0.55s both; }
        .pc-ct-4      { animation: enterContent 0.5s ease-out 0.65s both; }
        .pc-bt-1      { animation: enterBtn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.8s both; }
        .pc-bt-2      { animation: enterBtn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.9s both; }
      `}</style>

      {/* ═══════ CARD CONTAINER ═══════ */}
      <div className="relative rounded-[24px] sm:rounded-[32px] overflow-hidden"
        style={{ animation: 'breathe 5s ease-in-out infinite' }}>

        {/* Clean border with subtle pulse */}
        <div className="absolute inset-0 rounded-[24px] sm:rounded-[32px] pointer-events-none z-30"
          style={{ border: `1px solid ${positionColors.light}30`, animation: 'borderPulse 4s ease-in-out infinite' }}/>

        {/* Single light trace — top edge only */}
        <div className="absolute top-0 left-0 right-0 h-[1px] z-30 overflow-hidden pointer-events-none">
          <div className="absolute h-full w-[30%]" style={{
            background: `linear-gradient(90deg, transparent, ${positionColors.light}99 50%, transparent)`,
            animation: 'traceTop 6s ease-in-out infinite',
          }}/>
        </div>

        {/* ═══════ LIQUID AURORA BACKGROUND ═══════ */}
        <div className="absolute inset-0" style={{ background: '#08080f' }}>
          {/* Subtle position-colored aurora */}
          <div className="absolute top-[-30%] right-[-20%] w-[70%] h-[80%] rounded-full pointer-events-none"
            style={{ background: `radial-gradient(ellipse, ${positionColors.light}22 0%, ${positionColors.light}0A 50%, transparent 75%)`, filter: 'blur(60px)', animation: 'liquidA 14s ease-in-out infinite' }}/>
          {/* Secondary accent */}
          <div className="absolute bottom-[-25%] left-[-15%] w-[65%] h-[75%] rounded-full pointer-events-none"
            style={{ background: `radial-gradient(ellipse, ${positionColors.dark}18 0%, ${positionColors.dark}08 50%, transparent 75%)`, filter: 'blur(70px)', animation: 'liquidB 18s ease-in-out infinite' }}/>

          {/* Very subtle grain for texture */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat', backgroundSize: '128px 128px'
          }}/>
        </div>

        {/* ═══ Moving light sweep — left to right ═══ */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-[24px] sm:rounded-[32px]">
          <div className="absolute top-0 bottom-0 w-[40%]" style={{
            background: `linear-gradient(90deg, transparent 0%, ${positionColors.light}12 30%, ${positionColors.light}20 50%, ${positionColors.light}12 70%, transparent 100%)`,
            animation: 'sweepGlow 6s ease-in-out infinite',
          }}/>
        </div>

        {/* ═══════ CONTENT ═══════ */}
        <div className="relative z-20 p-7 sm:p-9 lg:p-11">
          <div className="flex flex-col lg:flex-row gap-8 sm:gap-10 items-center lg:items-stretch">

            {/* ── PHOTO ── */}
            <div className="pc-photo-w relative flex-shrink-0">
              {/* Subtle ambient glow behind photo */}
              <div className="absolute -inset-4 rounded-[22px] sm:rounded-[26px]" style={{
                background: `radial-gradient(ellipse, ${positionColors.light}1A 0%, ${positionColors.light}08 50%, transparent 80%)`,
                filter: 'blur(20px)',
                animation: 'borderPulse 5s ease-in-out infinite',
              }}/>
              {/* Clean gradient border */}
              <div className="absolute -inset-[2px] rounded-[20px] sm:rounded-[24px]" style={{
                background: `linear-gradient(160deg, ${positionColors.light}40 0%, ${positionColors.light}15 40%, ${positionColors.light}30 100%)`,
              }}/>
              {/* Photo */}
              <div className="relative rounded-[18px] sm:rounded-[22px] overflow-hidden"
                style={{ animation: 'photoAura 6s ease-in-out infinite' }}>
                <img
                  src={player.photoUrl ? (player.photoUrl.startsWith('http') ? player.photoUrl : `${BACKEND_URL}${player.photoUrl}`) : '/default-avatar.png'}
                  alt={player.name}
                  loading="lazy"
                  className="w-52 h-64 sm:w-60 sm:h-[19rem] md:w-64 md:h-[20rem] lg:w-[17rem] lg:h-[22rem] object-cover"
                />
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="flex-1 flex flex-col justify-center gap-5 sm:gap-6 w-full min-w-0">

              {/* Player Name — generous sizing, proper descender space */}
              <div className="pc-ct-1 text-center lg:text-left">
                <h1 style={{
                  fontSize: 'clamp(1.75rem, 5vw, 3.25rem)',
                  fontWeight: 900,
                  lineHeight: 1.25,
                  paddingBottom: '4px',
                  background: `linear-gradient(135deg, #ffffff 0%, ${positionColors.light} 30%, ${positionColors.dark} 55%, ${positionColors.light} 80%, #ffffff 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: `drop-shadow(0 2px 12px ${positionColors.light}33)`,
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  letterSpacing: '-0.01em',
                }}>
                  {player.name}
                </h1>
              </div>

              {/* Field tags — clean capsules */}
              {fieldsToShow.length > 0 && (
                <div className="pc-ct-2 flex flex-wrap gap-2.5 justify-center lg:justify-start">
                  {fieldsToShow.map((field, i) => (
                    <span key={field.fieldName}
                      className="inline-flex items-center rounded-full font-semibold uppercase tracking-wider"
                      style={{
                        padding: '6px 18px',
                        fontSize: '0.75rem',
                        letterSpacing: '0.1em',
                        background: field.isHighPriority
                          ? `${positionColors.light}14`
                          : 'rgba(255,255,255,0.04)',
                        border: field.isHighPriority
                          ? `1px solid ${positionColors.light}30`
                          : '1px solid rgba(255,255,255,0.08)',
                        color: field.isHighPriority ? positionColors.light : 'rgba(255,255,255,0.5)',
                        boxShadow: 'none',
                        animationDelay: `${0.5 + i * 0.08}s`,
                      }}>
                      {String(field.value)}
                    </span>
                  ))}
                </div>
              )}

              {/* Thin separator line */}
              <div className="pc-ct-3">
                <div className="h-[1px] w-full" style={{
                  background: `linear-gradient(to right, ${positionColors.light}66, ${positionColors.light}1A 60%, transparent)`,
                }}/>
              </div>

              {/* Bid Input */}
              <div className="pc-ct-4">
                <label className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.2em] mb-2 block"
                  style={{ color: `${positionColors.light}66` }}>
                  Bid Amount
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl sm:text-2xl font-bold pointer-events-none"
                    style={{ color: `${positionColors.light}33` }}>₹</span>
                  <input
                    type="number"
                    value={soldAmount || ''}
                    onChange={(e) => setSoldAmount(Number(e.target.value))}
                    className="w-full pl-12 pr-5 py-3.5 sm:py-4 text-xl sm:text-2xl font-bold rounded-2xl text-white placeholder-white/10 focus:outline-none transition-all duration-300"
                    placeholder="0"
                    disabled={loading}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${bidError ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.06)'}`,
                      boxShadow: bidError ? '0 0 20px rgba(239,68,68,0.06)' : 'inset 0 2px 6px rgba(0,0,0,0.2)',
                    }}
                    onFocus={(e) => { if (!bidError) { e.currentTarget.style.borderColor = `${positionColors.light}4D`; e.currentTarget.style.boxShadow = `0 0 0 3px ${positionColors.light}0F, inset 0 2px 6px rgba(0,0,0,0.2)`; }}}
                    onBlur={(e) => { if (!bidError) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.boxShadow = 'inset 0 2px 6px rgba(0,0,0,0.2)'; }}}
                  />
                </div>
                {bidError && (
                  <p className="mt-1.5 text-red-400/80 text-xs font-medium flex items-center gap-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    {bidError}
                  </p>
                )}
              </div>

              {/* Buttons */}
              {isAuctioneer ? (
                <div className="flex gap-3.5 sm:gap-4 flex-col sm:flex-row">
                  {/* SOLD */}
                  <button onClick={handleSoldClick} disabled={loading}
                    className="pc-bt-1 group relative flex-1 py-4 sm:py-[18px] rounded-2xl font-bold text-[13px] sm:text-sm tracking-[0.18em] uppercase overflow-hidden transition-all duration-500 hover:-translate-y-[2px] active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(160deg, #10b981 0%, #059669 50%, #047857 100%)',
                      animation: 'soldGlow 4s ease-in-out infinite',
                      border: 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 14px 50px rgba(16,185,129,0.4), 0 0 80px rgba(16,185,129,0.12)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent rounded-2xl pointer-events-none"/>
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden">
                      <div className="absolute inset-0 w-1/2" style={{ background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.15) 50%, transparent 65%)', animation: 'shimmer 2.5s ease-in-out infinite' }}/>
                    </div>
                    <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                      {loading ? (
                        <svg className="animate-spin h-4.5 w-4.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      ) : (
                        <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      )}
                      <span style={{ fontFamily: "'Georgia', serif", textShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>{loading ? 'Processing...' : 'Sold'}</span>
                    </span>
                  </button>

                  {/* UNSOLD */}
                  <button onClick={handleUnsoldClick} disabled={loading}
                    className="pc-bt-2 group relative flex-1 py-4 sm:py-[18px] rounded-2xl font-bold text-[13px] sm:text-sm tracking-[0.18em] uppercase overflow-hidden transition-all duration-500 hover:-translate-y-[2px] active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'; e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.boxShadow = '0 10px 36px rgba(239,68,68,0.12), inset 0 1px 0 rgba(255,255,255,0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.3)'; }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 text-white/45 group-hover:text-red-300/80 transition-colors duration-400">
                      {loading ? (
                        <svg className="animate-spin h-4.5 w-4.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                      ) : (
                        <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      )}
                      <span style={{ fontFamily: "'Georgia', serif" }}>{loading ? 'Processing...' : 'Unsold'}</span>
                    </span>
                  </button>
                </div>
              ) : (
                <div className="py-3 px-4 rounded-xl text-center" style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)'
                }}>
                  <p className="text-white/20 text-[11px] tracking-[0.15em] uppercase flex items-center justify-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
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
