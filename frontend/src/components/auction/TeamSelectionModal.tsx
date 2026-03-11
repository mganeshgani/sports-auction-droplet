import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

interface Team {
  _id: string;
  name: string;
  logoUrl?: string;
  remainingBudget: number;
  budget: number | null;
  totalBudget?: number;
  filledSlots: number;
  totalSlots: number;
}

interface TeamSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  soldAmount: number;
  onSelectTeam: (teamId: string) => void;
}

const GOLD = 'rgba(201,168,76,';
const GOLD_HEX = '#c9a84c';

const TeamSelectionModal: React.FC<TeamSelectionModalProps> = ({
  isOpen,
  onClose,
  teams,
  soldAmount,
  onSelectTeam,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canAfford = (team: Team) => (team.remainingBudget || 0) >= soldAmount;
  const hasSlots = (team: Team) => team.filledSlots < team.totalSlots;
  const isEligible = (team: Team) => canAfford(team) && hasSlots(team);

  const handleTeamClick = (teamId: string, team: Team) => {
    if (!isEligible(team)) return;
    setSelectedTeamId(teamId);
  };

  const handleConfirm = () => {
    if (selectedTeamId) {
      onSelectTeam(selectedTeamId);
      setSelectedTeamId(null);
      setSearchTerm('');
    }
  };

  const handleClose = () => {
    setSelectedTeamId(null);
    setSearchTerm('');
    onClose();
  };

  const getTotalBudget = (team: Team) => team.totalBudget || team.budget || 0;
  const getBudgetPercentage = (team: Team) => {
    const total = getTotalBudget(team);
    return total > 0 ? ((team.remainingBudget || 0) / total) * 100 : 0;
  };
  const getSlotsPercentage = (team: Team) => (team.filledSlots / team.totalSlots) * 100;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 tsm-backdrop"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-none">
        <div
          className="tsm-modal pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Outer gold border glow */}
          <div className="tsm-border-glow" />

          {/* Header */}
          <div className="tsm-header">
            {/* Close Button */}
            <button onClick={handleClose} className="tsm-close-btn group">
              <svg className="w-3.5 h-3.5 text-[rgba(201,168,76,.5)] group-hover:text-[#c9a84c] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Crown + Title */}
            <div className="text-center">
              <div className="tsm-crown-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z"/>
                  <path d="M19 19H5v-2h14v2z"/>
                </svg>
              </div>
              <h2 className="tsm-title">SELECT TEAM</h2>
              <div className="tsm-separator" />
              <p className="tsm-subtitle">
                Choose the team for this player · Sold: <span style={{ color: GOLD_HEX }}>{formatCurrency(soldAmount)}</span>
              </p>
            </div>

            {/* Search Bar */}
            <div className="mt-3 sm:mt-4">
              <div className="relative max-w-sm mx-auto">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search teams..."
                  className="tsm-search"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: `${GOLD}.35)` }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Teams Grid */}
          <div className="tsm-grid-area tsm-scrollbar">
            {filteredTeams.length === 0 ? (
              <div className="text-center py-10">
                <p style={{ color: `${GOLD}.4)`, fontFamily: 'Georgia, serif', fontSize: '13px', letterSpacing: '2px' }}>NO TEAMS FOUND</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-5">
                {filteredTeams.map((team) => {
                  const eligible = isEligible(team);
                  const affordable = canAfford(team);
                  const slots = hasSlots(team);
                  const selected = selectedTeamId === team._id;

                  return (
                    <button
                      key={team._id}
                      onClick={() => handleTeamClick(team._id, team)}
                      disabled={!eligible}
                      className={`tsm-team-card ${selected ? 'tsm-selected' : ''} ${!eligible ? 'tsm-disabled' : ''}`}
                    >
                      {/* Shimmer on hover */}
                      {eligible && <div className="tsm-card-shimmer" />}

                      {/* Selection check */}
                      {selected && (
                        <div className="tsm-check-badge">
                          <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}

                      {/* Ineligible Overlay */}
                      {!eligible && (
                        <div className="tsm-ineligible-overlay">
                          <p style={{ color: '#e87c7c', fontSize: '10px', letterSpacing: '2px', fontFamily: 'Georgia, serif' }}>
                            {!affordable ? 'INSUFFICIENT BUDGET' : 'NO SLOTS'}
                          </p>
                        </div>
                      )}

                      {/* Team Header — Logo + Name */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="tsm-team-logo-wrap">
                          {team.logoUrl ? (
                            <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <span style={{ color: GOLD_HEX, fontFamily: 'Georgia, serif', fontSize: '18px' }}>
                              {team.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <h3 className="tsm-team-name">{team.name}</h3>
                          {eligible && (
                            <span className="tsm-eligible-badge">ELIGIBLE</span>
                          )}
                        </div>
                      </div>

                      {/* Budget */}
                      <div className="mb-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="tsm-stat-label">BUDGET</span>
                          <span className={`tsm-stat-value ${affordable ? '' : 'tsm-stat-danger'}`}>
                            {formatCurrency(team.remainingBudget || 0)}
                          </span>
                        </div>
                        <div className="tsm-progress-track">
                          <div
                            className="tsm-progress-bar"
                            style={{
                              width: `${getBudgetPercentage(team)}%`,
                              background: getBudgetPercentage(team) > 50
                                ? `linear-gradient(90deg, ${GOLD}.6), ${GOLD}.9))`
                                : getBudgetPercentage(team) > 25
                                ? `linear-gradient(90deg, ${GOLD}.4), ${GOLD}.7))`
                                : 'linear-gradient(90deg, #e87c7c, #c95555)',
                            }}
                          />
                        </div>
                      </div>

                      {/* Slots */}
                      <div className="mb-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="tsm-stat-label">SLOTS</span>
                          <span className={`tsm-stat-value ${slots ? '' : 'tsm-stat-danger'}`}>
                            {team.filledSlots} / {team.totalSlots}
                          </span>
                        </div>
                        <div className="tsm-progress-track">
                          <div
                            className="tsm-progress-bar"
                            style={{
                              width: `${getSlotsPercentage(team)}%`,
                              background: getSlotsPercentage(team) < 80
                                ? `linear-gradient(90deg, ${GOLD}.4), ${GOLD}.7))`
                                : 'linear-gradient(90deg, #e87c7c, #c95555)',
                            }}
                          />
                        </div>
                      </div>

                      {/* After purchase */}
                      {eligible && (
                        <div className="tsm-after-row">
                          <span className="tsm-after-label">AFTER PURCHASE</span>
                          <span className="tsm-after-value">
                            {formatCurrency((team.remainingBudget || 0) - soldAmount)}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="tsm-footer">
            <button onClick={handleClose} className="tsm-cancel-btn">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedTeamId}
              className={`tsm-confirm-btn ${selectedTeamId ? 'tsm-confirm-active' : ''}`}
            >
              {selectedTeamId ? 'CONFIRM SELECTION' : 'SELECT A TEAM'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        /* ═══ TEAM SELECTION MODAL — PREMIUM ═══ */

        .tsm-backdrop {
          background: rgba(0,0,0,.85);
          backdrop-filter: blur(8px);
          animation: tsmFadeIn .25s ease-out;
        }

        .tsm-modal {
          position: relative;
          width: 100%;
          max-width: 960px;
          max-height: 92vh;
          background: #0a0806;
          border-radius: 16px;
          border: 1px solid ${GOLD}.18);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow:
            0 0 60px rgba(0,0,0,.5),
            0 0 30px ${GOLD}.06),
            inset 0 1px 0 ${GOLD}.1);
          animation: tsmSlideUp .35s ease-out;
        }

        .tsm-border-glow {
          position: absolute;
          inset: -1px;
          border-radius: 17px;
          background: linear-gradient(135deg, ${GOLD}.15), transparent 40%, transparent 60%, ${GOLD}.15));
          pointer-events: none;
          z-index: 0;
        }

        /* ── HEADER ── */
        .tsm-header {
          position: relative;
          z-index: 1;
          padding: 20px 20px 16px;
          background: linear-gradient(180deg, ${GOLD}.04) 0%, transparent 100%);
          border-bottom: 1px solid ${GOLD}.12);
        }

        .tsm-close-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid ${GOLD}.15);
          background: ${GOLD}.04);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all .25s;
          z-index: 2;
        }
        .tsm-close-btn:hover {
          border-color: ${GOLD}.35);
          background: ${GOLD}.08);
          transform: rotate(90deg);
        }

        .tsm-crown-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid ${GOLD}.25);
          background: ${GOLD}.06);
          color: ${GOLD_HEX};
          margin-bottom: 10px;
        }

        .tsm-title {
          font-family: 'Georgia', serif;
          font-size: 22px;
          font-weight: 400;
          letter-spacing: 6px;
          color: ${GOLD_HEX};
          margin: 0 0 8px;
        }

        .tsm-separator {
          width: 48px;
          height: 1px;
          background: linear-gradient(90deg, transparent, ${GOLD}.4), transparent);
          margin: 0 auto 10px;
        }

        .tsm-subtitle {
          font-family: 'Georgia', serif;
          font-size: 12px;
          color: rgba(255,255,255,.4);
          letter-spacing: 1px;
          margin: 0;
        }

        /* Search */
        .tsm-search {
          width: 100%;
          padding: 9px 12px 9px 32px;
          background: ${GOLD}.03);
          border: 1px solid ${GOLD}.15);
          border-radius: 10px;
          color: #fff;
          font-family: 'Georgia', serif;
          font-size: 13px;
          letter-spacing: .5px;
          outline: none;
          transition: border-color .25s;
        }
        .tsm-search::placeholder {
          color: ${GOLD}.25);
        }
        .tsm-search:focus {
          border-color: ${GOLD}.35);
        }

        /* ── GRID AREA ── */
        .tsm-grid-area {
          flex: 1;
          overflow-y: auto;
          position: relative;
          z-index: 1;
        }

        /* ── TEAM CARD ── */
        .tsm-team-card {
          position: relative;
          text-align: left;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid ${GOLD}.12);
          background: ${GOLD}.02);
          cursor: pointer;
          transition: all .3s ease;
          overflow: hidden;
        }
        .tsm-team-card:not(.tsm-disabled):hover {
          border-color: ${GOLD}.3);
          background: ${GOLD}.04);
          box-shadow: 0 4px 20px ${GOLD}.08);
          transform: translateY(-2px);
        }
        .tsm-team-card.tsm-selected {
          border-color: ${GOLD_HEX};
          background: ${GOLD}.06);
          box-shadow: 0 0 25px ${GOLD}.12), inset 0 0 15px ${GOLD}.04);
        }
        .tsm-team-card.tsm-disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .tsm-card-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, ${GOLD}.05) 48%, ${GOLD}.08) 50%, ${GOLD}.05) 52%, transparent 60%);
          background-size: 250% 100%;
          opacity: 0;
          transition: opacity .3s;
          pointer-events: none;
        }
        .tsm-team-card:hover .tsm-card-shimmer {
          opacity: 1;
          animation: tsmShimmer 3s ease-in-out infinite;
        }

        /* Selection check badge */
        .tsm-check-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: ${GOLD_HEX};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px ${GOLD}.4);
          z-index: 3;
        }

        /* Ineligible overlay */
        .tsm-ineligible-overlay {
          position: absolute;
          inset: 0;
          border-radius: 12px;
          background: rgba(0,0,0,.75);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        /* Team logo */
        .tsm-team-logo-wrap {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          border: 1px solid ${GOLD}.2);
          background: ${GOLD}.04);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
        }

        .tsm-team-name {
          font-family: 'Georgia', serif;
          font-size: 15px;
          color: #fff;
          font-weight: 400;
          letter-spacing: .5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0;
        }

        .tsm-eligible-badge {
          font-family: 'Georgia', serif;
          font-size: 8px;
          letter-spacing: 2px;
          color: ${GOLD}.5);
          text-transform: uppercase;
        }

        /* Stats */
        .tsm-stat-label {
          font-family: 'Georgia', serif;
          font-size: 9px;
          letter-spacing: 2px;
          color: ${GOLD}.4);
        }

        .tsm-stat-value {
          font-family: 'Georgia', serif;
          font-size: 12px;
          color: ${GOLD_HEX};
          letter-spacing: .5px;
        }
        .tsm-stat-danger {
          color: #e87c7c !important;
        }

        /* Progress bars */
        .tsm-progress-track {
          height: 3px;
          background: ${GOLD}.08);
          border-radius: 2px;
          overflow: hidden;
        }

        .tsm-progress-bar {
          height: 100%;
          border-radius: 2px;
          transition: width .5s ease;
        }

        /* After row */
        .tsm-after-row {
          margin-top: 4px;
          padding-top: 8px;
          border-top: 1px solid ${GOLD}.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .tsm-after-label {
          font-family: 'Georgia', serif;
          font-size: 8px;
          letter-spacing: 2px;
          color: rgba(255,255,255,.25);
        }

        .tsm-after-value {
          font-family: 'Georgia', serif;
          font-size: 13px;
          color: ${GOLD_HEX};
          letter-spacing: .5px;
        }

        /* ── FOOTER ── */
        .tsm-footer {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-top: 1px solid ${GOLD}.1);
          background: ${GOLD}.02);
        }

        .tsm-cancel-btn {
          padding: 8px 20px;
          border-radius: 8px;
          border: 1px solid ${GOLD}.15);
          background: transparent;
          color: rgba(255,255,255,.5);
          font-family: 'Georgia', serif;
          font-size: 12px;
          letter-spacing: 1.5px;
          cursor: pointer;
          transition: all .25s;
        }
        .tsm-cancel-btn:hover {
          border-color: ${GOLD}.3);
          color: rgba(255,255,255,.7);
        }

        .tsm-confirm-btn {
          padding: 10px 28px;
          border-radius: 8px;
          border: 1px solid ${GOLD}.15);
          background: ${GOLD}.04);
          color: ${GOLD}.35);
          font-family: 'Georgia', serif;
          font-size: 12px;
          letter-spacing: 2px;
          cursor: not-allowed;
          transition: all .3s;
        }
        .tsm-confirm-btn.tsm-confirm-active {
          border-color: ${GOLD_HEX};
          background: linear-gradient(135deg, ${GOLD}.15), ${GOLD}.08));
          color: ${GOLD_HEX};
          cursor: pointer;
          box-shadow: 0 0 20px ${GOLD}.15);
        }
        .tsm-confirm-btn.tsm-confirm-active:hover {
          background: linear-gradient(135deg, ${GOLD}.22), ${GOLD}.12));
          box-shadow: 0 0 30px ${GOLD}.2);
          transform: translateY(-1px);
        }

        /* ── SCROLLBAR ── */
        .tsm-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .tsm-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .tsm-scrollbar::-webkit-scrollbar-thumb {
          background: ${GOLD}.2);
          border-radius: 4px;
        }
        .tsm-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${GOLD}.35);
        }

        /* ── ANIMATIONS ── */
        @keyframes tsmFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes tsmSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes tsmShimmer {
          0%   { background-position: 150% 0; }
          100% { background-position: -50% 0; }
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 640px) {
          .tsm-modal { max-height: 95vh; border-radius: 12px; }
          .tsm-header { padding: 16px 16px 12px; }
          .tsm-title { font-size: 18px; letter-spacing: 4px; }
          .tsm-team-card { padding: 12px; }
          .tsm-footer { padding: 12px 16px; }
          .tsm-confirm-btn { padding: 8px 20px; font-size: 11px; }
        }
      `}</style>
    </>
  );
};

export default TeamSelectionModal;
