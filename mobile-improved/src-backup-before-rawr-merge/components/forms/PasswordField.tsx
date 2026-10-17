import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { TextField } from './TextField';

interface PasswordFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  hint?: string;
  leading?: React.ReactNode;
  typingSound?: boolean;
  onVisibleChange?: (visible: boolean) => void;
}

export function PasswordField({ label, error, hint, onVisibleChange, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  function toggleVisible() {
    const next = !visible;
    setVisible(next);
    onVisibleChange?.(next);
  }

  return (
    <TextField
      {...props}
      label={label}
      type={visible ? 'text' : 'password'}
      error={error}
      hint={hint}
      trailing={
      <button
        type="button"
        onClick={toggleVisible}
        className="rounded-md p-1 text-ink/45 outline-none transition-colors duration-150 ease-out hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-amber"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}>
        
          {visible ? <EyeOffIcon aria-hidden="true" className="h-5 w-5" /> : <EyeIcon aria-hidden="true" className="h-5 w-5" />}
        </button>
      } />);


}