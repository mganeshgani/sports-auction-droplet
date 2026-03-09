import React, { memo, useMemo } from 'react';
import { Team } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface TeamCardProps {
  team: Team;
  compact?: boolean;
}

const TeamCard: React.FC<TeamCardProps> = memo(({ team, compact = false }) => {
  const budgetPercentage = useMemo(() => 
    team.budget && team.remainingBudget 
      ? ((team.remainingBudget / team.budget) * 100) 
      : 0,
    [team.budget, team.remainingBudget]
  );

  const slotsPercentage = useMemo(() => 
    team.totalSlots && team.filledSlots
      ? ((team.filledSlots / team.totalSlots) * 100)
      : 0,
    [team.totalSlots, team.filledSlots]
  );

  const budgetColors = useMemo(() => {
    if (budgetPercentage > 50) return { from: '#B08B4F', to: '#C99D5F', tw: 'from-yellow-400 to-amber-500' };
    if (budgetPercentage > 25) return { from: '#B08B4F', to: '#A07A3F', tw: 'from-yellow-400 to-amber-500' };
    return { from: '#7D4B57', to: '#8D5B67', tw: 'from-amber-500 to-yellow-600' };
  }, [budgetPercentage]);

  const slotsColors = useMemo(() => {
    if (slotsPercentage < 50) return { from: '#7D4B57', to: '#8D5B67', tw: 'from-blue-900 to-purple-900' };
    if (slotsPercentage < 80) return { from: '#7D4B57', to: '#A07A3F', tw: 'from-purple-900 to-purple-600' };
    return { from: '#B08B4F', to: '#C99D5F', tw: 'from-yellow-400 to-amber-500' };
  }, [slotsPercentage]);

  if (compact) {
    return (
      <div className="group relative">
        {/* Gold Glow Effect */}
        <div style={{
          position: 'absolute',
          inset: '-2px',
          background: 'linear-gradient(135deg, rgba(176, 139, 79, 0.3), rgba(176, 139, 79, 0.2))',
          borderRadius: '12px',
          filter: 'blur(8px)',
          opacity: 0.2,
          transition: 'opacity 300ms'
        }} className="group-hover:opacity-40"></div>
        
        {/* Premium Black Card */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(10, 10, 10, 0.6) 50%, rgba(0, 0, 0, 0.7) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '10px',
          padding: '6px',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 30px rgba(212, 175, 55, 0.1)',
          transition: 'all 300ms'
        }} className="hover:border-[rgba(212,175,55,0.4)] sm:p-2">
          {/* Team Name with Gold Icon */}
          <div className="flex items-center gap-1 sm:gap-1.5 mb-1 sm:mb-1.5">
            <div className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0" style={{
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #B08B4F, #C99D5F)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 800,
              fontSize: '0.65rem',
              color: '#0E0E12',
              boxShadow: '0 0 20px rgba(176, 139, 79, 0.4)',
              overflow: 'hidden'
            }}>
              {team.logoUrl ? (
                <img src={team.logoUrl} alt={team.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                team.name.charAt(0).toUpperCase()
              )}
            </div>
            <h3 className="text-xs sm:text-[0.8125rem]" style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 700,
              color: '#F5F5F5',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '0.05em',
              textShadow: '0 2px 8px rgba(176, 139, 79, 0.2)'
            }}>{team.name}</h3>
            {budgetPercentage > 0 && budgetPercentage < 15 && <span title="Low budget" className="text-[10px] flex-shrink-0">🔥</span>}
            {slotsPercentage >= 100 && <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 font-bold flex-shrink-0">FULL</span>}
          </div>

          {/* Stats */}
          <div className="space-y-1 sm:space-y-1.5">
            {/* Budget */}
            <div>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[9px] sm:text-[10px]" style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                  color: '#A0A0A5',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Budget
                </span>
                <span className="text-[9px] sm:text-[10px]" style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 700,
                  color: '#B08B4F'
                }}>
                  {formatCurrency(team.remainingBudget)}
                </span>
              </div>
              <div style={{
                height: '4px',
                background: 'rgba(26, 26, 31, 0.6)',
                borderRadius: '9999px',
                overflow: 'hidden',
                border: '1px solid rgba(176, 139, 79, 0.25)'
              }} className="sm:h-[5px]">
                <div 
                  style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${budgetColors.from}, ${budgetColors.to})`,
                    borderRadius: '9999px',
                    transition: 'width 500ms',
                    width: `${budgetPercentage}%`,
                    boxShadow: '0 0 10px rgba(176, 139, 79, 0.4)'
                  }}
                ></div>
              </div>
            </div>

            {/* Slots */}
            <div>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-[9px] sm:text-[10px]" style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                  color: '#A0A0A5',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Players
                </span>
                <span className="text-[9px] sm:text-[10px]" style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 700,
                  color: '#B08B4F'
                }}>
                  {team.filledSlots}/{team.totalSlots}
                </span>
              </div>
              <div style={{
                height: '4px',
                background: 'rgba(26, 26, 31, 0.6)',
                borderRadius: '9999px',
                overflow: 'hidden',
                border: '1px solid rgba(176, 139, 79, 0.25)'
              }} className="sm:h-[5px]">
                <div 
                  style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${slotsColors.from}, ${slotsColors.to})`,
                    borderRadius: '9999px',
                    transition: 'width 500ms',
                    width: `${slotsPercentage}%`,
                    boxShadow: slotsPercentage > 0 ? '0 0 10px rgba(176, 139, 79, 0.3)' : 'none'
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Gold Bottom Accent */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, rgba(176, 139, 79, 0.3), #B08B4F, rgba(176, 139, 79, 0.3))',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px'
          }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      {/* Premium Gold Glow Effect */}
      <div style={{
        position: 'absolute',
        inset: '-4px',
        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.4), rgba(255, 215, 0, 0.3), rgba(212, 175, 55, 0.4))',
        borderRadius: '20px',
        filter: 'blur(16px)',
        opacity: 0.3,
        transition: 'opacity 500ms'
      }} className="group-hover:opacity-50 animate-pulse"></div>
      
      {/* Premium Black Glass Card */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(26, 26, 26, 0.9), rgba(0, 0, 0, 0.95))',
        backdropFilter: 'blur(25px)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 40px rgba(212, 175, 55, 0.15)',
        border: '1px solid rgba(212, 175, 55, 0.25)'
      }} className="sm:rounded-[20px]">
        {/* Top Gold Accent */}
        <div style={{
          height: '3px',
          background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.3), #FFD700, #D4AF37, #FFD700, rgba(212, 175, 55, 0.3))',
          boxShadow: '0 0 10px rgba(255, 215, 0, 0.3)'
        }}></div>
        
        <div className="p-4 sm:p-6">
          {/* Team Header */}
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 group-hover:scale-110" style={{
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #FFD700, #D4AF37, #FFD700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 900,
              fontSize: '1.25rem',
              color: '#000000',
              boxShadow: '0 0 30px rgba(212, 175, 55, 0.5), inset 0 2px 10px rgba(255, 255, 255, 0.2)',
              transition: 'transform 300ms',
              overflow: 'hidden'
            }}>
              {team.logoUrl ? (
                <img src={team.logoUrl} alt={team.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span className="text-xl sm:text-2xl">{team.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-2xl truncate" style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                color: '#FFFFFF',
                marginBottom: '4px',
                textShadow: '0 2px 12px rgba(212, 175, 55, 0.3)',
                letterSpacing: '0.02em'
              }}>{team.name}</h3>
              <p className="text-xs sm:text-sm" style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 600,
                color: '#9ca3af'
              }}>Team Overview</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="space-y-3 sm:space-y-4">
            {/* Total Budget */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.6), rgba(0, 0, 0, 0.4))',
              borderRadius: '10px',
              padding: '12px',
              border: '1px solid rgba(212, 175, 55, 0.2)'
            }} className="sm:rounded-xl sm:p-4">
              <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                <span className="text-xs sm:text-sm" style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Total Budget
                </span>
                <span className="text-base sm:text-xl" style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 800,
                  color: '#FFFFFF'
                }}>
                  {formatCurrency(team.budget)}
                </span>
              </div>
            </div>

            {/* Remaining Budget */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.6), rgba(0, 0, 0, 0.4))',
              borderRadius: '10px',
              padding: '12px',
              border: '1px solid rgba(212, 175, 55, 0.2)'
            }} className="sm:rounded-xl sm:p-4">
              <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                <span className="text-xs sm:text-sm" style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Remaining
                </span>
                <span className="text-base sm:text-xl" style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 800,
                  color: '#FFD700',
                  textShadow: '0 0 10px rgba(255, 215, 0, 0.3)'
                }}>
                  {formatCurrency(team.remainingBudget)}
                </span>
              </div>
              <div style={{
                height: '10px',
                background: 'rgba(0, 0, 0, 0.5)',
                borderRadius: '9999px',
                overflow: 'hidden',
                marginTop: '8px',
                border: '1px solid rgba(212, 175, 55, 0.2)'
              }} className="sm:h-3">
                <div 
                  className={`h-full bg-gradient-to-r ${budgetColors.tw} rounded-full transition-all duration-500`}
                  style={{ 
                    width: `${budgetPercentage}%`,
                    boxShadow: '0 0 15px rgba(212, 175, 55, 0.4)'
                  }}
                ></div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] sm:text-xs" style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                  color: '#9ca3af'
                }}>{budgetPercentage.toFixed(0)}% left</span>
              </div>
            </div>

            {/* Players */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.6), rgba(0, 0, 0, 0.4))',
              borderRadius: '10px',
              padding: '12px',
              border: '1px solid rgba(212, 175, 55, 0.2)'
            }} className="sm:rounded-xl sm:p-4">
              <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                <span className="text-xs sm:text-sm" style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Squad
                </span>
                <span className="text-base sm:text-xl" style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 800,
                  color: '#FFFFFF'
                }}>
                  {team.filledSlots} / {team.totalSlots}
                </span>
              </div>
              <div style={{
                height: '10px',
                background: 'rgba(0, 0, 0, 0.5)',
                borderRadius: '9999px',
                overflow: 'hidden',
                marginTop: '8px',
                border: '1px solid rgba(212, 175, 55, 0.2)'
              }} className="sm:h-3">
                <div 
                  className={`h-full bg-gradient-to-r ${slotsColors.tw} rounded-full transition-all duration-500`}
                  style={{ 
                    width: `${slotsPercentage}%`,
                    boxShadow: slotsPercentage > 0 ? '0 0 15px rgba(212, 175, 55, 0.3)' : 'none'
                  }}
                ></div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] sm:text-xs" style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                  color: '#9ca3af'
                }}>{slotsPercentage.toFixed(0)}% filled</span>
                <span className="text-[10px] sm:text-xs" style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 600,
                  color: '#9ca3af'
                }}>{team.totalSlots - (team.filledSlots || 0)} slots left</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Gold Accent */}
        <div style={{
          height: '3px',
          background: 'linear-gradient(90deg, rgba(212, 175, 55, 0.3), #FFD700, #D4AF37, #FFD700, rgba(212, 175, 55, 0.3))',
          boxShadow: '0 0 10px rgba(255, 215, 0, 0.3)'
        }}></div>
      </div>
    </div>
  );
});

TeamCard.displayName = 'TeamCard';

export default TeamCard;
