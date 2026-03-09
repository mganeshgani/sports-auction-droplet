import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Player } from '../types';
import { HIGH_PRIORITY_KEY } from '../hooks/useDisplaySettings';
import { formatCurrency } from '../utils/formatters';

interface FormField {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
}

interface PlayerDetailModalProps {
  player: Player | null;
  onClose: () => void;
}

const PlayerDetailModal: React.FC<PlayerDetailModalProps> = ({ player, onClose }) => {
  const BACKEND_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001';
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [highPriorityField, setHighPriorityField] = useState<string | null>(null);

  // Fetch form fields and high priority setting
  useEffect(() => {
    const fetchFormFields = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const response = await axios.get(`${API_URL}/form-config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFormFields(response.data.fields || []);
        
        // Load high priority field from localStorage
        const savedHighPriority = localStorage.getItem(HIGH_PRIORITY_KEY);
        if (savedHighPriority) {
          setHighPriorityField(savedHighPriority);
        }
      } catch (error) {
        console.error('Error fetching form fields:', error);
      }
    };
    
    if (player) {
      fetchFormFields();
    }
  }, [player, API_URL]);

  // Helper to get player field value
  const getPlayerFieldValue = (fieldName: string): any => {
    if (!player) return null;
    // Check direct property first
    if ((player as any)[fieldName] !== undefined) {
      return (player as any)[fieldName];
    }
    // Check customFields
    if (player.customFields) {
      return player.customFields[fieldName];
    }
    return null;
  };

  // Get displayable fields (exclude photo and name which are shown separately)
  // High priority field is sorted first
  const getDisplayableFields = (): { fieldName: string; fieldLabel: string; value: any; isHighPriority: boolean }[] => {
    const fields = formFields
      .filter(f => f.fieldName !== 'name' && f.fieldName !== 'photoUrl' && f.fieldType !== 'file')
      .map(f => ({
        fieldName: f.fieldName,
        fieldLabel: f.fieldLabel,
        value: getPlayerFieldValue(f.fieldName),
        isHighPriority: f.fieldName === highPriorityField
      }))
      .filter(f => f.value !== null && f.value !== undefined && f.value !== '');
    
    // Sort high priority first
    return fields.sort((a, b) => {
      if (a.isHighPriority) return -1;
      if (b.isHighPriority) return 1;
      return 0;
    });
  };

  if (!player) return null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'sold':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.4)',
          color: '#10b981',
          text: 'SOLD',
          icon: '✓'
        };
      case 'unsold':
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.4)',
          color: '#ef4444',
          text: 'UNSOLD',
          icon: '✗'
        };
      default:
        return {
          bg: 'rgba(212, 175, 55, 0.15)',
          border: 'rgba(212, 175, 55, 0.4)',
          color: '#D4AF37',
          text: 'AVAILABLE',
          icon: '◆'
        };
    }
  };

  const statusConfig = getStatusConfig(player.status);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      {/* Main Modal Container */}
      <div 
        className="relative w-full max-w-md max-h-[90vh] animate-modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Premium Outer Glow */}
        <div className="absolute -inset-2 rounded-3xl blur-xl opacity-40 animate-pulse"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(212, 175, 55, 0.4) 0%, rgba(212, 175, 55, 0.1) 50%, transparent 80%)',
            animationDuration: '3s'
          }}
        />

        {/* Card Container */}
        <div className="relative overflow-hidden rounded-2xl max-h-[85vh] overflow-y-auto custom-scrollbar"
          style={{
            background: 'linear-gradient(165deg, #0a0a0a 0%, #141414 30%, #1a1a1a 60%, #0d0d0d 100%)',
            border: '1.5px solid rgba(212, 175, 55, 0.25)',
            boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 80px rgba(212, 175, 55, 0.1)'
          }}
        >
          {/* Top Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.6) 50%, transparent 100%)' }}
          />

          {/* Ambient Corner Glows */}
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(212, 175, 55, 0.5) 0%, transparent 70%)' }}
          />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-3xl opacity-15"
            style={{ background: 'radial-gradient(circle, rgba(212, 175, 55, 0.4) 0%, transparent 70%)' }}
          />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <svg className="w-5 h-5 text-gray-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Status Badge */}
          <div className="absolute top-4 left-4 z-20">
            <div className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              style={{
                background: statusConfig.bg,
                border: `1px solid ${statusConfig.border}`,
                color: statusConfig.color,
                boxShadow: `0 0 20px ${statusConfig.bg}`
              }}
            >
              <span>{statusConfig.icon}</span>
              {statusConfig.text}
            </div>
          </div>

          {/* Player Photo Section */}
          <div className="relative pt-14 pb-4 flex justify-center">
            {/* Photo Container with Premium Ring */}
            <div className="relative">
              {/* Animated Ring */}
              <div className="absolute -inset-2 rounded-xl animate-spin-slow opacity-60"
                style={{
                  background: 'conic-gradient(from 0deg, transparent 0%, rgba(212, 175, 55, 0.5) 25%, transparent 50%, rgba(212, 175, 55, 0.5) 75%, transparent 100%)',
                  animationDuration: '8s'
                }}
              />
              
              {/* Inner Glow */}
              <div className="absolute -inset-1 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.3) 0%, transparent 50%, rgba(212, 175, 55, 0.3) 100%)',
                }}
              />
              
              {/* Photo */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden"
                style={{
                  border: '2px solid rgba(212, 175, 55, 0.4)',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.6), 0 0 30px rgba(212, 175, 55, 0.15)'
                }}
              >
                {player.photoUrl && player.photoUrl.trim() !== '' ? (
                  <img 
                    src={player.photoUrl.startsWith('http') ? player.photoUrl : `${BACKEND_URL}${player.photoUrl}`}
                    alt={player.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl font-extralight"
                    style={{
                      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 100%)',
                      color: '#D4AF37'
                    }}
                  >
                    {player.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Player Name */}
          <div className="text-center px-6 pb-4">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F0D770 50%, #D4AF37 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                textShadow: '0 0 30px rgba(212, 175, 55, 0.3)'
              }}
            >
              {player.name}
            </h2>
          </div>

          {/* Divider */}
          <div className="mx-6 h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.3) 50%, transparent 100%)' }}
          />

          {/* Player Details Grid */}
          <div className="p-4 sm:p-6 space-y-3">
            {/* Dynamic Fields from Form Builder */}
            {getDisplayableFields().length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {getDisplayableFields().map((field, index) => {
                  // High priority field gets special gold styling
                  const highPriorityColor = { 
                    bg: 'rgba(245, 158, 11, 0.12)', 
                    border: 'rgba(245, 158, 11, 0.35)', 
                    icon: 'text-amber-400', 
                    iconBg: 'rgba(245, 158, 11, 0.25)' 
                  };
                  
                  const colors = [
                    { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.15)', icon: 'text-blue-400', iconBg: 'rgba(59, 130, 246, 0.2)' },
                    { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.15)', icon: 'text-emerald-400', iconBg: 'rgba(16, 185, 129, 0.2)' },
                    { bg: 'rgba(168, 85, 247, 0.08)', border: 'rgba(168, 85, 247, 0.15)', icon: 'text-purple-400', iconBg: 'rgba(168, 85, 247, 0.2)' },
                    { bg: 'rgba(236, 72, 153, 0.08)', border: 'rgba(236, 72, 153, 0.15)', icon: 'text-pink-400', iconBg: 'rgba(236, 72, 153, 0.2)' },
                  ];
                  
                  const color = field.isHighPriority ? highPriorityColor : colors[index % colors.length];
                  
                  return (
                    <div 
                      key={field.fieldName} 
                      className="rounded-lg sm:rounded-xl p-3"
                      style={{
                        background: `linear-gradient(135deg, ${color.bg} 0%, ${color.bg.replace(/0\.\d+/, '0.04')} 100%)`,
                        border: `1px solid ${color.border}`
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-5 h-5 rounded-md flex items-center justify-center"
                          style={{ background: color.iconBg }}
                        >
                          <span className={`text-[10px] ${color.icon}`}>●</span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-medium text-gray-500 truncate">
                          {field.fieldLabel}
                        </span>
                      </div>
                      <p className={`text-sm sm:text-base font-semibold pl-6 truncate ${field.isHighPriority ? 'text-amber-200' : 'text-white'}`}>
                        {String(field.value)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sold Amount - Only show if sold */}
            {player.status === 'sold' && player.soldAmount && (
              <div className="rounded-lg sm:rounded-xl p-3"
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(16, 185, 129, 0.2)' }}
                    >
                      <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-400 font-medium">Sold Amount</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-emerald-400">
                    {formatCurrency(player.soldAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* Registration Date */}
            <div className="rounded-lg sm:rounded-xl p-3"
              style={{
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.06) 0%, rgba(212, 175, 55, 0.02) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.1)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center"
                    style={{ background: 'rgba(212, 175, 55, 0.15)' }}
                  >
                    <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-[10px] sm:text-xs text-gray-500 font-medium">Registered</span>
                </div>
                <span className="text-xs sm:text-sm text-gray-400">
                  {new Date(player.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Accent */}
          <div className="absolute bottom-0 left-0 right-0 h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.3) 50%, transparent 100%)' }}
          />
        </div>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes modal-enter {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-modal-enter {
          animation: modal-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-spin-slow {
          animation: spin-slow linear infinite;
        }
      `}</style>
    </div>
  );
};

export default PlayerDetailModal;
