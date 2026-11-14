import React, { FormEvent, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ApiError, getProfile, updateProfile } from '../../api/laravel';
import { useAuth } from '../../auth/AuthContext';
import { FormMessage } from '../forms/FormMessage';
import { PrimaryButton } from '../forms/PrimaryButton';
import { TextField } from '../forms/TextField';
import { isValidEmail, isValidMobile } from '../../utils/validation';

type ProfileValues = {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  phone: string;
};

const EMPTY: ProfileValues = { first_name: '', middle_name: '', last_name: '', email: '', phone: '' };

/** Older accounts only stored a single `name`; split it the same way the server does. */
function splitLegacyName(name: string): ProfileValues {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { ...EMPTY };
  if (parts.length === 1) return { ...EMPTY, first_name: parts[0] };
  return {
    ...EMPTY,
    first_name: parts[0],
    middle_name: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
    last_name: parts[parts.length - 1],
  };
}

export function ProfileForm() {
  const { user, refreshSession } = useAuth();
  const [values, setValues] = useState<ProfileValues>(EMPTY);
  const [saved, setSaved] = useState<ProfileValues>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileValues, string>>>({});
  const [formError, setFormError] = useState<string>();

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    setLoading(true);

    getProfile()
      .then((page) => {
        if (!active) return;
        const profile = page.props?.user;
        const fallback = splitLegacyName(String(profile?.name || user.name || ''));
        const next: ProfileValues = {
          first_name: profile?.first_name || fallback.first_name,
          middle_name: profile?.middle_name || fallback.middle_name,
          last_name: profile?.last_name || fallback.last_name,
          email: profile?.email || user.email || '',
          phone: profile?.phone || user.phone || '',
        };
        setValues(next);
        setSaved(next);
      })
      .catch(() => {
        if (!active) return;
        // Offline / blocked: fall back to what the dashboard already knows.
        const fallback = splitLegacyName(String(user.name || ''));
        const next = {
          ...fallback,
          email: user.email || '',
          phone: user.phone || '',
        };
        setValues(next);
        setSaved(next);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id, user?.name, user?.email, user?.phone]);

  const dirty =
    values.first_name.trim() !== saved.first_name.trim() ||
    values.middle_name.trim() !== saved.middle_name.trim() ||
    values.last_name.trim() !== saved.last_name.trim() ||
    values.email.trim() !== saved.email.trim() ||
    values.phone.trim() !== saved.phone.trim();

  function update(field: keyof ProfileValues, value: string) {
    const next = field === 'phone' ? value.replace(/\D/g, '') : value;
    setValues((current) => ({ ...current, [field]: next }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(undefined);
    if (status === 'success') setStatus('idle');
  }

  function validate(): boolean {
    const next: Partial<Record<keyof ProfileValues, string>> = {};

    if (values.first_name.trim().length < 2) next.first_name = 'Enter your first name.';
    if (values.last_name.trim().length < 2) next.last_name = 'Enter your last name.';
    if (!isValidEmail(values.email)) next.email = 'Enter a valid email address.';
    if (!isValidMobile(values.phone)) next.phone = 'Use an 11-digit mobile number beginning with 09.';

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setStatus('loading');
    setFormError(undefined);
    try {
      const result = await updateProfile({
        first_name: values.first_name.trim(),
        middle_name: values.middle_name.trim(),
        last_name: values.last_name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
      });
      const next = { ...values, first_name: values.first_name.trim(), middle_name: values.middle_name.trim(), last_name: values.last_name.trim() };
      setSaved(next);
      setValues(next);
      if (result.name) {
        // Keep the header's display name in step without a full page reload.
        await refreshSession({ silent: true });
      }
      setStatus('success');
    } catch (reason: unknown) {
      setStatus('idle');
      if (reason instanceof ApiError) {
        const first = Object.values(reason.errors)[0]?.[0];
        setFormError(first || reason.message);
        setErrors(
          Object.fromEntries(
            Object.entries(reason.errors).map(([key, messages]) => [key, messages[0]]),
          ) as Partial<Record<keyof ProfileValues, string>>,
        );
      } else {
        setFormError('Unable to update your profile.');
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <h2 className="text-base font-bold tracking-[-0.02em] text-ink">Profile information</h2>
        <p className="mt-1 text-[13px] text-ink/55">
          Keep your name and mobile number up to date. The library uses them on your record.
        </p>
      </div>

      <dl className="divide-y divide-ink/[0.07] rounded-2xl bg-white px-4 text-sm ring-1 ring-ink/[0.06]">
        <div className="flex items-center justify-between gap-3 py-3">
          <dt className="text-ink/55">LRN</dt>
          <dd className="truncate font-semibold tabular-nums text-ink">{String(user?.lrn || user?.student_id || '—')}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-3">
          <dt className="text-ink/55">Academic strand</dt>
          <dd className="truncate font-semibold text-ink">{user?.academic_strand || '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 py-3">
          <dt className="text-ink/55">School</dt>
          <dd className="truncate font-semibold text-ink">{user?.school_name || '—'}</dd>
        </div>
      </dl>

      {loading ? (
        <p className="text-center text-xs text-ink/50">Loading your profile…</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="first_name"
          label="First name"
          autoComplete="given-name"
          className={errors.first_name ? undefined : 'bg-white'}
          value={values.first_name}
          onChange={(event) => update('first_name', event.target.value)}
          error={errors.first_name}
        />
        <TextField
          name="last_name"
          label="Last name"
          autoComplete="family-name"
          className={errors.last_name ? undefined : 'bg-white'}
          value={values.last_name}
          onChange={(event) => update('last_name', event.target.value)}
          error={errors.last_name}
        />
      </div>

      <TextField
        name="middle_name"
        label="Middle name"
        autoComplete="additional-name"
        hint="Optional."
        className="bg-white"
        value={values.middle_name}
        onChange={(event) => update('middle_name', event.target.value)}
      />

      <TextField
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        className={errors.email ? undefined : 'bg-white'}
        value={values.email}
        onChange={(event) => update('email', event.target.value)}
        error={errors.email}
      />

      <TextField
        name="phone"
        label="Mobile number"
        inputMode="tel"
        autoComplete="tel"
        maxLength={11}
        placeholder="09XXXXXXXXX"
        hint="Used for due-date reminders and password reset codes."
        className={errors.phone ? undefined : 'bg-white'}
        value={values.phone}
        onChange={(event) => update('phone', event.target.value)}
        error={errors.phone}
      />

      <AnimatePresence>
        {formError ? <FormMessage key="profile-error" type="error">{formError}</FormMessage> : null}
        {status === 'success' ? <FormMessage key="saved" type="success">Profile saved.</FormMessage> : null}
      </AnimatePresence>

      <PrimaryButton type="submit" loading={status === 'loading'} disabled={!dirty || loading} className="h-12">
        Save changes
      </PrimaryButton>
    </form>
  );
}
