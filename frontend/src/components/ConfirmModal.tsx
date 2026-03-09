import React from 'react';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES = {
  danger: {
    accent: 'rgba(239, 68, 68, 0.4)',
    glow: 'rgba(239, 68, 68, 0.15)',
    headerBorder: 'rgba(239, 68, 68, 0.3)',
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
    btnBg: 'bg-red-600 hover:bg-red-500',
    titleGradient: 'from-white via-red-200 to-red-400',
  },
  warning: {
    accent: 'rgba(245, 158, 11, 0.4)',
    glow: 'rgba(245, 158, 11, 0.15)',
    headerBorder: 'rgba(245, 158, 11, 0.3)',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    btnBg: 'bg-amber-600 hover:bg-amber-500',
    titleGradient: 'from-white via-amber-200 to-amber-400',
  },
  info: {
    accent: 'rgba(59, 130, 246, 0.4)',
    glow: 'rgba(59, 130, 246, 0.15)',
    headerBorder: 'rgba(59, 130, 246, 0.3)',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    btnBg: 'bg-blue-600 hover:bg-blue-500',
    titleGradient: 'from-white via-blue-200 to-blue-400',
  },
};

const ICONS = {
  danger: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const s = VARIANT_STYLES[variant];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-sm rounded-xl overflow-hidden animate-[fadeIn_0.15s_ease-out]"
        style={{
          background: 'linear-gradient(165deg, #0a0a0f 0%, #111118 100%)',
          border: `1px solid ${s.accent}`,
          boxShadow: `0 25px 50px rgba(0,0,0,0.8), 0 0 60px ${s.glow}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-3.5 border-b flex items-center gap-3"
          style={{
            background: `linear-gradient(135deg, ${s.glow} 0%, rgba(0,0,0,0.8) 100%)`,
            borderColor: s.headerBorder,
          }}
        >
          <div className={`w-9 h-9 rounded-lg ${s.iconBg} flex items-center justify-center ${s.iconColor}`}>
            {ICONS[variant]}
          </div>
          <h3
            className="text-base font-bold"
            style={{
              background: `linear-gradient(135deg, #fff, ${variant === 'danger' ? '#fca5a5' : variant === 'warning' ? '#fcd34d' : '#93c5fd'})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {title}
          </h3>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 flex justify-end gap-2.5">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-1.5 text-sm font-semibold text-white rounded-lg transition-colors ${s.btnBg}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
