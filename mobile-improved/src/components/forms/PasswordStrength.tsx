import React from 'react';
import { cn } from '../../utils/cn';
import { getPasswordStrength, passwordStrengthLabel } from '../../utils/validation';

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;
  const strength = getPasswordStrength(password);

  return (
    <div aria-live="polite" className="mt-2">
      <div className="grid grid-cols-4 gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((level) =>
        <div
          key={level}
          className={cn(
            'h-1 rounded-full bg-ink/10 transition-colors duration-150 ease-out',
            level <= strength && strength <= 1 ? 'bg-red-500' : '',
            level <= strength && strength === 2 ? 'bg-brand-amber' : '',
            level <= strength && strength === 3 ? 'bg-lime-600' : '',
            level <= strength && strength === 4 ? 'bg-emerald-600' : ''
          )} />

        )}
      </div>
      <p className="mt-1.5 text-xs text-ink/50">Password strength: <span className="font-semibold text-ink/70">{passwordStrengthLabel[strength]}</span></p>
    </div>);

}