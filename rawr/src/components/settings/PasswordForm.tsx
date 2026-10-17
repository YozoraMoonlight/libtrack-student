import React, { FormEvent, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ApiError, updatePassword } from '../../api/laravel';
import { FormMessage } from '../forms/FormMessage';
import { PasswordField } from '../forms/PasswordField';
import { PasswordStrength } from '../forms/PasswordStrength';
import { PrimaryButton } from '../forms/PrimaryButton';

type Field = 'current' | 'next' | 'confirm';
const empty: Record<Field, string> = { current: '', next: '', confirm: '' };

export function PasswordForm() {
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);
  const filled = values.current && values.next && values.confirm;

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError(null);
    if (status === 'success') setStatus('idle');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!values.current) next.current = 'Enter your current password.';
    if (values.next.length < 8) next.next = 'Use at least 8 characters.';
    if (values.next === values.current) next.next = 'Choose a password different from your current one.';
    if (values.confirm !== values.next) next.confirm = 'Passwords don’t match.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setStatus('loading');
    setServerError(null);
    try {
      await updatePassword({
        current_password: values.current,
        password: values.next,
        password_confirmation: values.confirm,
      });
      setValues(empty);
      setStatus('success');
    } catch (reason: unknown) {
      setStatus('idle');
      if (reason instanceof ApiError) {
        const fieldError = reason.errors.current_password?.[0] || reason.errors.password?.[0];
        setServerError(fieldError || reason.message);
      } else {
        setServerError('Unable to update your password.');
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <h2 className="text-base font-bold tracking-[-0.02em] text-ink">Change password</h2>
        <p className="mt-1 text-[13px] text-ink/55">Use a long, random password to keep your account secure.</p>
      </div>
      <PasswordField
        name="current-password"
        label="Current password"
        autoComplete="current-password"
        className={errors.current ? undefined : 'bg-white'}
        value={values.current}
        onChange={(event) => update('current', event.target.value)}
        error={errors.current}
      />
      <div>
        <PasswordField
          name="new-password"
          label="New password"
          autoComplete="new-password"
          className={errors.next ? undefined : 'bg-white'}
          value={values.next}
          onChange={(event) => update('next', event.target.value)}
          error={errors.next}
        />
        <PasswordStrength password={values.next} />
      </div>
      <PasswordField
        name="confirm-password"
        label="Confirm password"
        autoComplete="new-password"
        className={errors.confirm ? undefined : 'bg-white'}
        value={values.confirm}
        onChange={(event) => update('confirm', event.target.value)}
        error={errors.confirm}
      />
      {serverError ? <FormMessage type="error">{serverError}</FormMessage> : null}
      <AnimatePresence>
        {status === 'success' ? <FormMessage key="updated" type="success">Password updated.</FormMessage> : null}
      </AnimatePresence>
      <PrimaryButton type="submit" loading={status === 'loading'} disabled={!filled} className="h-12">Update password</PrimaryButton>
    </form>
  );
}
