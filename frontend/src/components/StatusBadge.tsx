import React from 'react';

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  sold: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  unsold: 'bg-red-500/15 text-red-400 border border-red-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  available: '● Available',
  sold: '✓ Sold',
  unsold: '✗ Unsold',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-500 border border-gray-200'} ${className}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
};

export default StatusBadge;
