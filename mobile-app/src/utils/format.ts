/** Peso amounts arrive from Laravel as strings or numbers. */
export function formatPeso(value: number | string | null | undefined): string {
  const amount = typeof value === 'string' ? Number(value.replace(/[^0-9.-]/g, '')) : Number(value ?? 0);
  const safe = Number.isFinite(amount) ? amount : 0;
  return `₱${safe.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function toNumber(value: number | string | null | undefined): number {
  const amount = typeof value === 'string' ? Number(value.replace(/[^0-9.-]/g, '')) : Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatShortDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
