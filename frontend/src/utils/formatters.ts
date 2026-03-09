export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-IN').format(n);
};

export const getBudgetColorClass = (remaining: number, initial: number): string => {
  if (!initial || initial === 0) return 'text-gray-500';
  const pct = remaining / initial;
  if (pct > 0.4) return 'text-green-600';
  if (pct > 0.15) return 'text-amber-500';
  return 'text-red-600';
};

export const getBudgetBgClass = (remaining: number, initial: number): string => {
  if (!initial || initial === 0) return 'bg-gray-100';
  const pct = remaining / initial;
  if (pct > 0.4) return 'bg-green-50';
  if (pct > 0.15) return 'bg-amber-50';
  return 'bg-red-50';
};
