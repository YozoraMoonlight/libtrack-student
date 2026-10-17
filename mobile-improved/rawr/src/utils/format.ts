import { format, parseISO } from 'date-fns';

export function formatPeso(value: number) {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(iso: string) {
  return format(parseISO(iso), 'MMM d, yyyy');
}

export function formatShortDate(iso: string) {
  return format(parseISO(iso), 'MMM d');
}