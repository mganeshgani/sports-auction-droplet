import React from 'react';
import { Player } from '../../types';

const BACKEND_URL = process.env.REACT_APP_API_URL?.replace(/\/api\/?$/, '') || 'http://localhost:5001';

interface UnsoldPlayerCardProps {
  player: Player;
  isAuctioneer: boolean;
  onAuction: (player: Player) => void;
  enabledFields?: any[];
}

const UnsoldPlayerCard = React.memo<UnsoldPlayerCardProps>(({ player, isAuctioneer, onAuction }) => {
  return (
    <div className="group relative">
      <div
        className="relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-500 hover:scale-[1.03] hover:-translate-y-1"
        style={{
          background: '#0a0a0a',
          boxShadow: '0 8px 40px -8px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.06)',
        }}
        onClick={() => isAuctioneer ? onAuction(player) : undefined}
      >
        {/* Full-bleed Photo Area */}
        <div className="relative w-full aspect-[3/4] overflow-hidden">
          {/* Photo or Gradient Placeholder */}
          {player.photoUrl && player.photoUrl.trim() !== '' ? (
            <img
              src={player.photoUrl.startsWith('http') ? player.photoUrl : `${BACKEND_URL}${player.photoUrl}`}
              alt={player.name}
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : null}
          
          {/* Fallback Initial */}
          {(!player.photoUrl || player.photoUrl.trim() === '') && (
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
            >
              <span className="text-5xl font-extralight tracking-tight text-white/30">
                {player.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Cinematic Bottom Gradient */}
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(0deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 35%, rgba(0,0,0,0.0) 55%, rgba(0,0,0,0.15) 100%)'
          }} />

          {/* Top-left: Unsold Badge */}
          <div className="absolute top-2.5 left-2.5">
            <div className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider backdrop-blur-md"
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
              }}
            >
              unsold
            </div>
          </div>

          {/* Bottom Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3 pb-3.5">
            <h3 className="text-[15px] font-bold text-white truncate leading-tight tracking-tight drop-shadow-lg">
              {player.name}
            </h3>
            <p className="text-[11px] text-gray-400 font-medium mt-1">
              {isAuctioneer ? 'Tap to auction' : 'Awaiting auction'}
            </p>
          </div>
        </div>

        {/* Auctioneer: Auction button on hover */}
        {isAuctioneer && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); onAuction(player); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
              style={{ background: 'rgba(16, 185, 129, 0.2)', backdropFilter: 'blur(12px)', border: '1px solid rgba(16,185,129,0.3)' }}
              title="Auction Now"
            >
              <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        )}

        {/* Hover border glow */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.15), 0 0 30px rgba(212, 175, 55, 0.12)' }}
        />
      </div>
    </div>
  );
});

UnsoldPlayerCard.displayName = 'UnsoldPlayerCard';

export default UnsoldPlayerCard;
