import { FormEvent, useEffect, useState } from 'react';
import { wait } from '../utils/async';
import { isValidEmail, isValidLrn, meetsPasswordRules } from '../utils/validation';

export type ResetStep = 'request' | 'verify' | 'done';
type Field = 'identifier' | 'code' | 'password' | 'confirm';

/** The mock SMS code — shown as a hint so the prototype can be completed. */
export const DEMO_RESET_CODE = '482913';
const RESEND_SECONDS = 30;

const empty: Record<Field, string> = { identifier: '', code: '', password: '', confirm: '' };

export function useForgotPassword() {
  const [step, setStep] = useState<ResetStep>('request');
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  function update(field: Field, value: string) {
    const next = field === 'code' ? value.replace(/\D/g, '').slice(0, 6) : value;
    setValues((current) => ({ ...current, [field]: next }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    if (offline) setOffline(false);
  }

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    const id = values.identifier.trim();
    if (!id) return setErrors({ identifier: 'Enter your email address or 12-digit LRN.' });
    if (!isValidEmail(id) && !isValidLrn(id)) return setErrors({ identifier: 'Use a valid email or a 12-digit LRN.' });
    if (!navigator.onLine) return setOffline(true);

    setLoading(true);
    await wait(900);
    setLoading(false);
    setResent(false);
    setResendIn(RESEND_SECONDS);
    setStep('verify');
  }

  function resendCode() {
    if (resendIn > 0) return;
    setValues((current) => ({ ...current, code: '' }));
    setErrors((current) => ({ ...current, code: undefined }));
    setResent(true);
    setResendIn(RESEND_SECONDS);
  }

  function changeAccount() {
    setValues({ ...empty, identifier: values.identifier });
    setErrors({});
    setResendIn(0);
    setStep('request');
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    const next: typeof errors = {};
    if (values.code.length !== 6) next.code = 'Enter the 6-digit code from the text message.';else
    if (values.code !== DEMO_RESET_CODE) next.code = 'That code is incorrect or has expired.';
    if (!values.password) next.password = 'Choose a new password.';else
    if (!meetsPasswordRules(values.password)) next.password = 'Your password doesn’t meet every requirement yet.';
    if (!values.confirm) next.confirm = 'Type your new password again.';else
    if (values.confirm !== values.password) next.confirm = 'Passwords don’t match.';
    setErrors(next);
    if (Object.keys(next).length) return;
    if (!navigator.onLine) return setOffline(true);

    setLoading(true);
    await wait(1000);
    setLoading(false);
    setStep('done');
  }

  return { step, values, errors, loading, offline, resendIn, resent, update, sendCode, resendCode, changeAccount, resetPassword };
}