import React, { FormEvent, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ApiError, updateProfile } from '../../api/laravel';
import { useAuth } from '../../auth/AuthContext';
import { FormMessage } from '../forms/FormMessage';
import { PrimaryButton } from '../forms/PrimaryButton';
import { TextField } from '../forms/TextField';

export function ProfileForm() {
  const { user, refreshSession } = useAuth();
  const [savedName, setSavedName] = useState(user?.name || '');
  const [name, setName] = useState(user?.name || '');
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    if (!user?.name) return;
    setSavedName(user.name);
    setName(user.name);
  }, [user?.name]);

  const dirty = name.trim() !== savedName;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }

    setStatus('loading');
    setError(undefined);
    try {
      const result = await updateProfile(name.trim());
      setSavedName(result.name);
      setName(result.name);
      await refreshSession({ silent: true });
      setStatus('success');
    } catch (reason: unknown) {
      setStatus('idle');
      if (reason instanceof ApiError) setError(Object.values(reason.errors)[0]?.[0] || reason.message);
      else setError('Unable to update your profile.');
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <h2 className="text-base font-bold tracking-[-0.02em] text-ink">Profile information</h2>
        <p className="mt-1 text-[13px] text-ink/55">Update your account’s profile information.</p>
      </div>
      <TextField
        name="name"
        label="Name"
        autoComplete="name"
        className={error ? undefined : 'bg-white'}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          setError(undefined);
          if (status === 'success') setStatus('idle');
        }}
        error={error}
      />
      <TextField
        name="email"
        label="Email"
        value={user?.email || ''}
        readOnly
        aria-readonly="true"
        className="cursor-not-allowed text-ink/50 focus:border-ink/10 focus:ring-0"
        hint="Email cannot be changed."
      />
      <AnimatePresence>
        {status === 'success' ? <FormMessage key="saved" type="success">Profile saved.</FormMessage> : null}
      </AnimatePresence>
      <PrimaryButton type="submit" loading={status === 'loading'} disabled={!dirty} className="h-12">Save changes</PrimaryButton>
    </form>
  );
}
