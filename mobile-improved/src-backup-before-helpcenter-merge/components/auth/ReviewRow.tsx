import React from 'react';

interface ReviewRowProps {
  label: string;
  value: string;
}

export function ReviewRow({ label, value }: ReviewRowProps) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-4 py-4 text-sm">
      <dt className="text-ink/45">{label}</dt>
      <dd className="break-words font-semibold text-ink">{value}</dd>
    </div>);

}