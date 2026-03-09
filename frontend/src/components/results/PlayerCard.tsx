import React from 'react';
import { Player } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface PlayerCardProps {
  player: Player;
  index: number;
  isAuctioneer: boolean;
  onChangeTeam: (player: Player) => void;
  onDelete: (player: Player) => void;
}

const PlayerCard = React.memo<PlayerCardProps>(({ player, index, isAuctioneer, onChangeTeam, onDelete }) => {
  return (
    <div
      className="group relative rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl flex flex-col"
      style={{
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(10, 10, 10, 0.6) 50%, rgba(0, 0, 0, 0.7) 100%)',
        border: '2px solid rgba(212, 175, 55, 0.3)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 40px rgba(212, 175, 55, 0.1)'
      }}
    >
      {/* Glow Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/5 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl pointer-events-none"></div>
      
      {/* Player Number Badge */}
      <div className="absolute top-3 left-3 z-10">
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm" style={{
          background: 'linear-gradient(135deg, #D4AF37 0%, #F0D770 100%)',
          color: '#000',
          boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)'
        }}>
          {index + 1}
        </div>
      </div>

      {/* Position Badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className="px-2 py-1 rounded-full text-xs font-bold backdrop-blur-sm" style={{
          background: player.position === 'Spiker' ? 'rgba(251, 191, 36, 0.9)' :
                     player.position === 'Setter' ? 'rgba(168, 85, 247, 0.9)' :
                     player.position === 'Libero' ? 'rgba(59, 130, 246, 0.9)' :
                     player.position === 'Blocker' ? 'rgba(239, 68, 68, 0.9)' :
                     'rgba(16, 185, 129, 0.9)',
          color: '#fff'
        }}>
          {player.position}
        </div>
      </div>

      {/* Player Content */}
      <div className="relative p-4 flex-1">
        {/* Player Icon */}
        <div className="text-4xl mb-3 text-center">
          {player.position === 'Spiker' ? '🏐' :
           player.position === 'Setter' ? '⭐' :
           player.position === 'Libero' ? '🛡️' :
           player.position === 'Blocker' ? '🔥' : '🏐'}
        </div>

        {/* Player Name */}
        <h3 className="text-lg font-black text-center mb-2 tracking-tight" style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F0D770 50%, #D4AF37 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {player.name}
        </h3>

        {/* Player Details */}
        <div className="space-y-2">
          {player.class && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Class:</span>
              <span className="font-bold text-white">{player.class}</span>
            </div>
          )}
        </div>

        {/* Sold Amount */}
        <div className="mt-3 pt-3 border-t border-amber-500/30">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Sold For</span>
            <span className="text-xl font-black" style={{
              background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {formatCurrency(player.soldAmount!)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons - Separate Section at Bottom */}
      <div className="relative p-2 sm:p-3 border-t" style={{
        borderColor: 'rgba(212, 175, 55, 0.2)',
        background: 'linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.5))'
      }}>
        {isAuctioneer ? (
        <div className="flex gap-1.5 sm:gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onChangeTeam(player);
            }}
            className="flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 flex items-center justify-center gap-1 sm:gap-2"
            title="Change player team"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="text-xs sm:text-sm font-bold text-white">Change</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(player);
            }}
            className="flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-red-500/30 flex items-center justify-center gap-1 sm:gap-2"
            title="Remove player from team"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-xs sm:text-sm font-bold text-white">Remove</span>
          </button>
        </div>
        ) : (
          <div className="mt-2 sm:mt-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-center" style={{
            background: 'rgba(100, 100, 100, 0.2)',
            border: '1px solid rgba(150, 150, 150, 0.3)'
          }}>
            <p className="text-gray-400 text-[10px] sm:text-xs">🔒 Viewer Mode</p>
          </div>
        )}
      </div>
    </div>
  );
});

PlayerCard.displayName = 'PlayerCard';

export default PlayerCard;
