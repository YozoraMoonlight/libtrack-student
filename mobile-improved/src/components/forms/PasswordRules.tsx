import React from 'react';
import { CheckIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { passwordRules } from '../../utils/validation';

interface PasswordRulesProps {
  password: string;
  id?: string;
}

/** Live checklist that turns green as each password rule is met. */
export function PasswordRules({ password, id }: PasswordRulesProps) {
  return (
    <ul id={id} aria-label="Password requirements" className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 pl-1">
      {passwordRules.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.label}
            className={cn(
              'flex items-center gap-1.5 text-xs transition-colors duration-150 ease-out',
              met ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink/45'
            )}>
            
            <span
              aria-hidden="true"
              className={cn(
                'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-out',
                met ? 'bg-emerald-600 text-white' : 'ring-1 ring-ink/20'
              )}>
              
              {met ? <CheckIcon className="h-2.5 w-2.5" strokeWidth={3.5} /> : null}
            </span>
            <span className="whitespace-nowrap">{rule.label}</span>
            <span className="sr-only">{met ? ' — met' : ' — not met'}</span>
          </li>);

      })}
    </ul>);

}