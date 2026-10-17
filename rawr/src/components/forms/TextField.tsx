import React, { forwardRef } from 'react';
import { AlertCircleIcon, CheckCircle2Icon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  valid?: boolean;
  trailing?: React.ReactNode;
  leading?: React.ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
{ label, error, hint, valid = false, trailing, leading, className, id, required, ...props },
ref)
{
  const fieldId = id ?? props.name;
  const messageId = `${fieldId}-message`;

  return (
    <div>
      <label htmlFor={fieldId} className="mb-2 block pl-1 text-[14px] font-semibold leading-none text-ink/80">
        {label}
        {required ? <span className="ml-1 text-brand-ember" aria-hidden="true">*</span> : null}
      </label>
      <div className="relative">
        {leading ?
        <div className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 items-center text-ink/40">{leading}</div> :
        null}
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(
            'h-14 w-full rounded-2xl border-[1.5px] px-4 text-[16px] text-ink outline-none placeholder:text-[16px] placeholder:text-ink/35 focus:border-ink focus:bg-white focus:ring-4 focus:ring-brand-amber/25',
            'transition-[border-color,box-shadow,background-color] duration-150 ease-out',
            leading ? 'pl-12' : '',
            trailing || valid || error ? 'pr-12' : '',
            error ? 'border-red-500 bg-red-50/40 dark:bg-red-500/10' : 'border-ink/10 bg-paper/50',
            valid ? 'border-emerald-500' : '',
            className
          )}
          {...props} />
        
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center">
          {trailing}
          {!trailing && error ? <AlertCircleIcon aria-hidden="true" className="h-5 w-5 text-red-600" /> : null}
          {!trailing && valid ? <CheckCircle2Icon aria-hidden="true" className="h-5 w-5 text-emerald-600" /> : null}
        </div>
      </div>
      {error || hint ?
      <p id={messageId} className={cn('mt-1.5 pl-1 text-xs leading-5', error ? 'text-red-700 dark:text-red-400' : 'text-ink/50')}>
          {error ?? hint}
        </p> :
      null}
    </div>);

});