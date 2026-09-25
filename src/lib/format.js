import { format, formatDistanceToNowStrict, isToday, isYesterday, parseISO } from 'date-fns';

export const toDate = (v) => (v instanceof Date ? v : typeof v === 'string' ? parseISO(v) : new Date(v));

export const fmtDate = (v) => (v ? format(toDate(v), 'MMM d, yyyy') : '—');
export const fmtTime = (v) => (v ? format(toDate(v), 'h:mm a') : '—');
export const fmtDateTime = (v) => (v ? format(toDate(v), 'MMM d, yyyy · h:mm a') : '—');

export function fmtRelative(v) {
  if (!v) return '—';
  const d = toDate(v);
  if (isToday(d)) return `Today, ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `Yesterday, ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
}

export const fmtAgo = (v) => (v ? `${formatDistanceToNowStrict(toDate(v))} ago` : '—');

export const fmtPercent = (n, digits = 0) =>
  Number.isFinite(n) ? `${(n * 100).toFixed(digits)}%` : '—';

export const fmtMoney = (n) =>
  Number.isFinite(Number(n))
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(n))
    : '—';

export const fmtNumber = (n) => (Number.isFinite(n) ? new Intl.NumberFormat('en-US').format(n) : '—');

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export const ADDON_LABELS = {
  booking: 'Booking Built In',
  review_generation: 'Review Generation',
  automated_followup: 'Automated Follow-Up',
};

export const PLAN_LABELS = {
  foundation: 'Foundation',
  growth: 'Growth',
  full_stack: 'Full Stack',
};

export const labelFor = (map, key) => map[key] ?? key?.replace(/_/g, ' ') ?? '—';
