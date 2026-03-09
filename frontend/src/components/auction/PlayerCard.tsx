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
  const BACKEND_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001';

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
      {/* Premium entrance animations */}
      <style>{`
        @keyframes elegantEntrance {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
            filter: blur(10px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: blur(0);
          }
        }

        @keyframes luxuryGlow {
          0%, 100% {
            box-shadow: 0 10px 50px rgba(234, 179, 8, 0.3);
          }
          50% {
            box-shadow: 0 20px 80px rgba(234, 179, 8, 0.5);
          }
        }

        @keyframes goldShimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }

        @keyframes photoReveal {
          0% {
            opacity: 0;
            filter: blur(20px);
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            filter: blur(0);
            transform: scale(1);
          }
        }

        @keyframes badgeEntrance {
          0% {
            opacity: 0;
            transform: translateY(-10px) rotate(-10deg);
          }
          100% {
            opacity: 1;
            transform: translateY(0) rotate(0);
          }
        }

        @keyframes contentFadeIn {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes buttonSlide {
          0% {
            opacity: 0;
            transform: translateX(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes floatingParticle {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.4;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.8;
          }
        }

        .premium-player-card-wrapper {
          animation: elegantEntrance 1s cubic-bezier(0.34, 1.56, 0.64, 1);
          animation-fill-mode: both;
        }

        .luxury-card-container {
          animation: luxuryGlow 3s ease-in-out infinite;
          position: relative;
          overflow: hidden;
        }

        .luxury-card-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 215, 0, 0.3),
            transparent
          );
          animation: goldShimmer 3s ease-in-out infinite;
        }

        .photo-reveal {
          animation: photoReveal 0.8s ease-out 0.3s;
          animation-fill-mode: both;
        }

        .badge-entrance {
          animation: badgeEntrance 0.6s ease-out 0.7s;
          animation-fill-mode: both;
        }

        .content-fade-1 {
          animation: contentFadeIn 0.6s ease-out 0.9s;
          animation-fill-mode: both;
        }

        .content-fade-2 {
          animation: contentFadeIn 0.6s ease-out 1s;
          animation-fill-mode: both;
        }

        .content-fade-3 {
          animation: contentFadeIn 0.6s ease-out 1.1s;
          animation-fill-mode: both;
        }

        .button-slide-1 {
          animation: buttonSlide 0.5s ease-out 1.2s;
          animation-fill-mode: both;
        }

        .button-slide-2 {
          animation: buttonSlide 0.5s ease-out 1.3s;
          animation-fill-mode: both;
        }

        .floating-particle {
          animation: floatingParticle 4s ease-in-out infinite;
        }

        /* Rotating ring effect */
        @keyframes rotateRing {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .rotating-ring {
          animation: rotateRing 8s linear infinite;
        }

        /* Ultra Premium Button Styles */
        .premium-sold-button,
        .premium-unsold-button {
          position: relative;
          cursor: pointer;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          transform-style: preserve-3d;
          transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .premium-sold-button:hover:not(:disabled),
        .premium-unsold-button:hover:not(:disabled) {
          transform: translateY(-6px) scale(1.05);
          filter: brightness(1.15) contrast(1.1);
        }

        .premium-sold-button:active:not(:disabled),
        .premium-unsold-button:active:not(:disabled) {
          transform: translateY(-2px) scale(1.02);
          transition: all 0.15s ease-out;
        }

        /* Elegant pulse animation for hover state */
        @keyframes elegantPulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }

        .premium-sold-button:hover:not(:disabled)::before,
        .premium-unsold-button:hover:not(:disabled)::before {
          animation: elegantPulse 2s ease-in-out infinite;
        }

        /* Radial gradient for premium feel */
        @keyframes radialGlow {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            opacity: 0.4;
          }
          100% {
            opacity: 0;
            transform: scale(1.5);
          }
        }

        /* Floating sparkle effect */
        @keyframes floatSparkle {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          50% {
            transform: translateY(-8px) scale(1.2);
            opacity: 1;
          }
        }
      `}</style>

      <div className="luxury-card-container relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 border border-amber-500/30">
        {/* Ambient floating particles */}
        <div className="absolute top-4 right-4 w-2 h-2 bg-amber-400 rounded-full floating-particle hidden sm:block" style={{ animationDelay: '0s' }}></div>
        <div className="absolute top-12 left-8 w-1.5 h-1.5 bg-amber-300 rounded-full floating-particle hidden sm:block" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-8 right-12 w-2 h-2 bg-amber-500 rounded-full floating-particle hidden sm:block" style={{ animationDelay: '2s' }}></div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 md:gap-8 items-center lg:items-start">
          {/* Left Section: Photo and Info Cards */}
          <div className="flex-shrink-0 flex flex-col items-center gap-3 sm:gap-4">
            {/* Photo with Rotating Ring - Always shown */}
            <div className="relative photo-reveal">
              <div className="absolute inset-0 rotating-ring">
                <div 
                  className={`absolute inset-0 rounded-full bg-gradient-to-r ${positionColors.gradient} opacity-50 blur-md`}
                  style={{ padding: '4px' }}
                ></div>
              </div>
              <div className="relative">
                <img
                  src={player.photoUrl ? (player.photoUrl.startsWith('http') ? player.photoUrl : `${BACKEND_URL}${player.photoUrl}`) : '/default-avatar.png'}
                  alt={player.name}
                  loading="lazy"
                  className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 rounded-full object-cover border-4 border-slate-800"
                  style={{ boxShadow: `0 0 40px ${positionColors.light}` }}
                />
              </div>
              
            </div>

            {/* Selected Fields from Settings (shown without labels) */}
            {fieldsToShow.length > 0 && (
              <div className="flex flex-col gap-2 sm:gap-3 w-full content-fade-1">
                {fieldsToShow.map((field) => (
                  <div 
                    key={field.fieldName} 
                    className={`backdrop-blur-sm rounded-lg sm:rounded-xl p-2 sm:p-3 border transition-all duration-300 ${
                      field.isHighPriority 
                        ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border-amber-400/40' 
                        : 'bg-slate-800/50 border-amber-500/20'
                    }`}
                  >
                    <div className={`font-bold text-sm sm:text-base text-center ${
                      field.isHighPriority ? 'text-amber-200' : 'text-white'
                    }`}>
                      {String(field.value)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Section: Name, Amount Input, and Action Buttons */}
          <div className="flex-1 flex flex-col justify-center gap-4 sm:gap-6 w-full">
            {/* Player Name - Always shown */}
            <div className="content-fade-2 text-center lg:text-left">
              <h1 
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent mb-2 sm:mb-3 leading-tight pb-1"
                style={{ 
                  textShadow: '0 0 30px rgba(251, 191, 36, 0.5)',
                  fontFamily: 'Georgia, serif'
                }}
              >
                {player.name}
              </h1>
              <div className="h-0.5 sm:h-1 w-20 sm:w-32 bg-gradient-to-r from-amber-500 to-transparent rounded-full mx-auto lg:mx-0"></div>
            </div>

            {/* Amount Input */}
            <div className="content-fade-3">
              <label className="block text-amber-400/90 font-semibold mb-2 sm:mb-3 text-sm sm:text-base lg:text-lg">
                Bid Amount (₹)
              </label>
              <input
                type="number"
                value={soldAmount || ''}
                onChange={(e) => {
                  setSoldAmount(Number(e.target.value));
                }}
                className={`w-full px-4 sm:px-6 py-3 sm:py-4 text-lg sm:text-xl md:text-2xl font-bold bg-slate-800/80 border-2 rounded-lg sm:rounded-xl text-white focus:outline-none focus:ring-4 transition-all ${
                  bidError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 animate-[shake_0.4s_ease-in-out]'
                    : 'border-amber-500/40 focus:border-amber-500 focus:ring-amber-500/20'
                }`}
                placeholder="Enter amount"
                disabled={loading}
                style={{ boxShadow: bidError ? '0 4px 20px rgba(239, 68, 68, 0.25)' : '0 4px 20px rgba(234, 179, 8, 0.15)' }}
              />
              {bidError && (
                <p className="mt-1.5 text-red-400 text-xs sm:text-sm font-medium flex items-center gap-1.5 animate-[fadeIn_0.2s_ease-out]">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {bidError}
                </p>
              )}
            </div>

            {/* Ultra Premium Action Buttons - Designer Edition */}
            {isAuctioneer ? (
            <div className="flex gap-3 sm:gap-4 md:gap-6 flex-col sm:flex-row">
              {/* SOLD Button - Sophisticated Gold & Deep Green Luxury */}
              <button
                onClick={handleSoldClick}
                disabled={loading}
                className="button-slide-1 premium-sold-button group flex-1 relative py-4 sm:py-5 md:py-6 px-6 sm:px-8 md:px-10 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg md:text-xl overflow-hidden transition-all duration-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {/* Rich jewel-tone gradient base - Deep emerald to forest */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0d9488] via-[#047857] to-[#065f46] opacity-95"></div>
                
                {/* Champagne gold luxury overlay - subtle elegance */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#d4af37]/40 via-[#f0e68c]/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                
                {/* Premium metallic border system */}
                <div className="absolute inset-0 rounded-2xl border-2 border-[#d4af37]/30 group-hover:border-[#d4af37]/60 transition-all duration-700"></div>
                <div className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-md"
                  style={{ background: 'linear-gradient(135deg, #d4af37 0%, #0d9488 50%, #d4af37 100%)', zIndex: -1 }}>
                </div>
                
                {/* Sophisticated shimmer - slower, more refined */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#faf8f3]/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1800ms] ease-out"></div>
                
                {/* Inner glow for depth */}
                <div className="absolute inset-0 rounded-2xl shadow-inner opacity-60"
                  style={{ boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 -2px 4px rgba(255, 255, 255, 0.1)' }}>
                </div>

                {/* Button content */}
                <span className="relative z-10 flex items-center justify-center gap-3 text-white drop-shadow-lg">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-7 h-7 drop-shadow-md group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                      <span className="tracking-[0.2em] font-black" style={{ fontFamily: 'Georgia, serif', textShadow: '0 2px 12px rgba(0, 0, 0, 0.4)' }}>SOLD</span>
                    </>
                  )}
                </span>
              </button>

              {/* UNSOLD Button - Refined Burgundy & Deep Rose Elegance */}
              <button
                onClick={handleUnsoldClick}
                disabled={loading}
                className="button-slide-2 premium-unsold-button group flex-1 relative py-4 sm:py-5 md:py-6 px-6 sm:px-8 md:px-10 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg md:text-xl overflow-hidden transition-all duration-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {/* Deep sophisticated burgundy to maroon gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#be123c] via-[#9f1239] to-[#881337] opacity-95"></div>
                
                {/* Warm copper/bronze luxury overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#cd7f32]/40 via-[#b87333]/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                
                {/* Premium metallic border system */}
                <div className="absolute inset-0 rounded-2xl border-2 border-[#cd7f32]/30 group-hover:border-[#cd7f32]/60 transition-all duration-700"></div>
                <div className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-md"
                  style={{ background: 'linear-gradient(135deg, #cd7f32 0%, #be123c 50%, #cd7f32 100%)', zIndex: -1 }}>
                </div>
                
                {/* Sophisticated shimmer - slower, more refined */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#fff5f0]/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1800ms] ease-out"></div>
                
                {/* Inner glow for depth */}
                <div className="absolute inset-0 rounded-2xl shadow-inner opacity-60"
                  style={{ boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 -2px 4px rgba(255, 255, 255, 0.1)' }}>
                </div>

                {/* Button content */}
                <span className="relative z-10 flex items-center justify-center gap-3 text-white drop-shadow-lg">
                  {loading ? (
                    <>
                      <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-7 h-7 drop-shadow-md group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                      </svg>
                      <span className="tracking-[0.2em] font-black" style={{ fontFamily: 'Georgia, serif', textShadow: '0 2px 12px rgba(0, 0, 0, 0.4)' }}>UNSOLD</span>
                    </>
                  )}
                </span>
              </button>
            </div>
            ) : (
              <div className="mt-6 px-6 py-4 rounded-lg text-center" style={{
                background: 'rgba(100, 100, 100, 0.2)',
                border: '1px solid rgba(150, 150, 150, 0.3)'
              }}>
                <p className="text-gray-400 text-sm">
                  🔒 Viewer Mode - You can watch but cannot place bids
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

PlayerCard.displayName = 'PlayerCard';

export default PlayerCard;
