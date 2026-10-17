import React, { FormEvent, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { LockIcon, UserIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { HeroAuthLayout } from '../components/auth/HeroAuthLayout';
import { LoginLoader } from '../components/auth/LoginLoader';
import { FormMessage } from '../components/forms/FormMessage';
import { PasswordField } from '../components/forms/PasswordField';
import { PrimaryButton } from '../components/forms/PrimaryButton';
import { TextField } from '../components/forms/TextField';
import { isValidEmail, isValidLrn } from '../utils/validation';

export function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{identifier?: string;password?: string;}>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'offline' | 'error'>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === 'loading') return;
    const nextErrors: typeof errors = {};
    if (!identifier.trim()) nextErrors.identifier = 'Enter your email address or 12-digit LRN.';else
    if (!isValidEmail(identifier) && !isValidLrn(identifier)) nextErrors.identifier = 'Use a valid email or a 12-digit LRN.';
    if (!password) nextErrors.password = 'Enter your password.';else
    if (password.length < 8) nextErrors.password = 'Password must be at least 8 characters.';
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length) return;

    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }

    setStatus('loading');
    const message = await login(identifier.trim(), password);
    if (message) {
      setFormError(message);
      setStatus('error');
      return;
    }

    navigate('/app');
  }

  return (
    <HeroAuthLayout title="Welcome back" subtitle="Sign in with your email or LRN to access your library account.">
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <TextField
          name="identifier"
          label="Email or LRN"
          placeholder="Email or 12-digit LRN"
          leading={<UserIcon aria-hidden="true" className="h-5 w-5" />}
          autoComplete="username"
          className={errors.identifier ? undefined : 'bg-white'}
          value={identifier}
          onChange={(event) => {
            setIdentifier(event.target.value);
            if (errors.identifier) setErrors((current) => ({ ...current, identifier: undefined }));
          }}
          error={errors.identifier} />
        
        <PasswordField
          name="password"
          label="Password"
          placeholder="Enter your password"
          leading={<LockIcon aria-hidden="true" className="h-5 w-5" />}
          autoComplete="current-password"
          className={errors.password ? undefined : 'bg-white'}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
          }}
          error={errors.password} />
        

        <AnimatePresence mode="wait">
          {status === 'offline' ?
          <FormMessage key="offline" type="error">You&apos;re offline. Connect to the internet to sign in.</FormMessage> :
          status === 'error' && formError ?
          <FormMessage key="error" type="error">{formError}</FormMessage> :
          null}
        </AnimatePresence>

        <PrimaryButton type="submit" disabled={status === 'loading'} className="!mt-5">
          Sign in
        </PrimaryButton>
      </form>

      {status === 'loading' ? <LoginLoader /> : null}

      <p className="mt-3 text-center text-[15px] text-ink/55">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="inline-block py-2 font-bold text-brand-ember underline-offset-4 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
          Create one
        </Link>
      </p>
    </HeroAuthLayout>);

}