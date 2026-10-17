import React, { FormEvent, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FormMessage } from '../forms/FormMessage';
import { PrimaryButton } from '../forms/PrimaryButton';
import { TextField } from '../forms/TextField';
import { currentStudent } from '../../data/currentStudent';

export function ProfileForm() {
  const [savedName, setSavedName] = useState(currentStudent.name);
  const [name, setName] = useState(currentStudent.name);
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const dirty = name.trim() !== savedName;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError('Enter your full name.');
      return;
    }
    setStatus('loading');
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSavedName(name.trim());
    setStatus('success');
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
        error={error} />
      
      <TextField
        name="email"
        label="Email"
        value={currentStudent.email}
        readOnly
        aria-readonly="true"
        className="cursor-not-allowed text-ink/50 focus:border-ink/10 focus:ring-0"
        hint="Email cannot be changed." />
      
      <AnimatePresence>
        {status === 'success' ?
        <FormMessage key="saved" type="success">
            Profile saved.
          </FormMessage> :
        null}
      </AnimatePresence>
      <PrimaryButton type="submit" loading={status === 'loading'} disabled={!dirty} className="h-12">
        Save changes
      </PrimaryButton>
    </form>);

}