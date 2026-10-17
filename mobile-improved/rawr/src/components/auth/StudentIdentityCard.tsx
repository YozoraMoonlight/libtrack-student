import React from 'react';
import { CheckIcon } from 'lucide-react';
import type { Student } from '../../types/auth';

interface StudentIdentityCardProps {
  student: Student;
  onChange: () => void;
}

export function StudentIdentityCard({ student, onChange }: StudentIdentityCardProps) {
  return (
    <div role="status" className="relative flex items-center gap-3 rounded-2xl border-[1.5px] border-brand-amber bg-white p-3.5 shadow-[0_12px_28px_-16px_rgba(233,168,37,0.7)]">
      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-700 text-white ring-[3px] ring-cream">
        <CheckIcon aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
      </span>
      <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-amber text-[14px] font-extrabold text-[#121212] shadow-[0_2px_0_#e9a825]">
        {getInitials(student.name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="sr-only">Student record verified:</p>
        <p className="truncate text-[16px] font-extrabold tracking-[-0.01em] text-ink">{student.name}</p>
        <p className="truncate text-[13px] font-semibold text-ink/55">{student.gradeSection}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className="shrink-0 rounded-lg px-2 py-2 text-[13px] font-bold text-brand-ember outline-none transition-colors duration-150 ease-out active:text-ink focus-visible:ring-2 focus-visible:ring-brand-amber">
        
        Change
      </button>
    </div>);

}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}