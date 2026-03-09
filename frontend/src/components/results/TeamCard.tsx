import React from 'react';
import { Team } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface TeamCardProps {
  team: Team;
  index: number;
  playerCount: number;
  actualFilledSlots: number;
  actualRemaining: number;
  actualSpent: number;
  budgetUsedPercentage: string;
  teamPlayers: any[];
  onClick: () => void;
  getPositionColor: (position: string) => string;
  getPositionIcon: (position: string) => string;
  enabledFields?: any[];
}

const TeamCard = React.memo<TeamCardProps>(({
  team,
  actualFilledSlots,
  actualRemaining,
  actualSpent,
  budgetUsedPercentage,
  teamPlayers,
  onClick,
}) => {
  const budgetPercent = parseFloat(budgetUsedPercentage);
  
  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer h-full"
      style={{ maxHeight: 'calc(100vh - 180px)' }}
    >
      {/* Luxury Card Container */}
      <div className="relative overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.02] h-full flex flex-col"
        style={{
          background: 'linear-gradient(145deg, #0c0c0c 0%, #1a1a1a 50%, #0f0f0f 100%)',
          border: '1px solid rgba(212, 175, 55, 0.15)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(212, 175, 55, 0.4) 0%, transparent 70%)' }}
        />
        
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.6) 50%, transparent 100%)' }}
        />

        {/* Header Section */}
        <div className="relative p-4 pb-3">
          <div className="flex items-center gap-3">
            {/* Team Logo/Initial */}
            <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
              }}
            >
              {team.logoUrl ? (
                <img src={team.logoUrl} alt={team.name} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-light tracking-tight" style={{ color: '#D4AF37' }}>
                  {team.name.charAt(0)}
                </span>
              )}
            </div>

            {/* Team Name */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold tracking-tight truncate text-white group-hover:text-amber-100 transition-colors">
                {team.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-gray-500 font-medium">
                  {actualFilledSlots}/{team.totalSlots} Players
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />

        {/* Stats Section */}
        <div className="p-4 pt-3 flex-1 flex flex-col">
          {/* Budget Display */}
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-0.5">Spent</p>
              <p className="text-2xl font-light tracking-tight" style={{ color: '#D4AF37' }}>
                {formatCurrency(actualSpent)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-0.5">Remaining</p>
            <p className={`text-lg font-medium ${(team.budget || 0) === 0 ? 'text-gray-500' : actualRemaining < (team.budget || 0) * 0.2 ? 'text-red-400' : 'text-emerald-400'}`}>
              {(team.budget || 0) > 0 ? formatCurrency(actualRemaining) : '∞'}
              </p>
            </div>
          </div>

          {/* Elegant Progress Bar */}
          <div className="relative h-1 rounded-full overflow-hidden mb-4"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${budgetPercent}%`,
                background: budgetPercent > 80 
                  ? 'linear-gradient(90deg, #ef4444, #dc2626)' 
                  : budgetPercent > 50 
                  ? 'linear-gradient(90deg, #D4AF37, #F0D770)' 
                  : 'linear-gradient(90deg, #10b981, #34d399)',
                boxShadow: `0 0 10px ${budgetPercent > 80 ? 'rgba(239,68,68,0.5)' : budgetPercent > 50 ? 'rgba(212,175,55,0.5)' : 'rgba(16,185,129,0.5)'}`
              }}
            />
          </div>

          {/* Player Count */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-3xl font-light tracking-tight" style={{ color: teamPlayers.length > 0 ? '#D4AF37' : 'rgba(255,255,255,0.15)' }}>
                {teamPlayers.length}
              </p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mt-1">
                {teamPlayers.length === 1 ? 'Player' : 'Players'}
              </p>
            </div>
          </div>

          {/* Click hint */}
          <div className="text-center pb-1">
            <p className="text-[10px] text-gray-600 group-hover:text-gray-400 transition-colors">
              Tap to view details
            </p>
          </div>
        </div>

        {/* Bottom Accent */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.2) 50%, transparent 100%)' }}
        />
      </div>
    </div>
  );
});

TeamCard.displayName = 'TeamCard';

export default TeamCard;
