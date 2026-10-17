import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiError, isConnectionError } from '../api/laravel';
import {
  cancelPasswordReset,
  requestPasswordReset,
  resendPasswordResetCode,
  resetPassword,
} from '../api/laravel';
import { isValidEmail, isValidLrn, meetsPasswordRules } from '../utils/validation';

export type ResetStep = 'request' | 'verify' | 'done';
type Field = 'identifier' | 'code' | 'password' | 'confirm';

const RESEND_SECONDS = 30;

const empty: Record<Field, string> = { identifier: '', code: '', password: '', confirm: '' };

function serverMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const first = Object.values(error.errors)[0]?.[0];
    return first || error.message || fallback;
  }
  return fallback;
}

/**
 * Password recovery against `password.forgot.*`.
 *
 * Step 1 posts the identifier and waits for an SMS; step 2 posts the 6-digit
 * code with the new password. The server deliberately never confirms whether an
 * account exists, so the copy here stays as non-committal as the web flow.
 */
export function useForgotPassword() {
  const [step, setStep] = useState<ResetStep>('request');
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [resent, setResent] = useState(false);
  const [serverNotice, setServerNotice] = useState<string | null>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const update = useCallback((field: Field, value: string) => {
    const next = field === 'code' ? value.replace(/\D/g, '').slice(0, 6) : value;
    setValues((current) => ({ ...current, [field]: next }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    if (offline) setOffline(false);
  }, [errors, offline]);

  const sendCode = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;

    const identifier = values.identifier.trim();
    if (!identifier) {
      setErrors({ identifier: 'Enter your email address or 12-digit LRN.' });
      return;
    }
    if (!isValidEmail(identifier) && !isValidLrn(identifier)) {
      setErrors({ identifier: 'Use a valid email or a 12-digit LRN.' });
      return;
    }
    if (!navigator.onLine) {
      setOffline(true);
      return;
    }

    setLoading(true);
    setErrors({});
    setServerNotice(null);

    try {
      await requestPasswordReset(identifier);
      setResent(false);
      setResendIn(RESEND_SECONDS);
      setServerNotice('If this account has a mobile number on file, a code is on its way.');
      setStep('verify');
    } catch (error) {
      if (isConnectionError(error)) {
        setOffline(true);
      } else {
        setErrors({ identifier: serverMessage(error, 'We could not start a password reset. Try again.') });
      }
    } finally {
      setLoading(false);
    }
  }, [loading, values.identifier]);

  const resendCode = useCallback(async () => {
    if (resendIn > 0 || loading) return;

    setLoading(true);
    setValues((current) => ({ ...current, code: '' }));
    setErrors((current) => ({ ...current, code: undefined }));

    try {
      await resendPasswordResetCode();
      setResent(true);
      setServerNotice('A new code is on its way.');
    } catch (error) {
      if (isConnectionError(error)) setOffline(true);
      else setServerNotice(serverMessage(error, 'We could not send a new code. Try again shortly.'));
    } finally {
      setResendIn(RESEND_SECONDS);
      setLoading(false);
    }
  }, [loading, resendIn]);

  const changeAccount = useCallback(async () => {
    setLoading(true);
    try {
      await cancelPasswordReset();
    } catch {
      // Abandoning the request locally is fine even if the server call fails.
    }
    setValues({ ...empty, identifier: values.identifier });
    setErrors({});
    setResendIn(0);
    setResent(false);
    setServerNotice(null);
    setLoading(false);
    setStep('request');
  }, [values.identifier]);

  const resetPasswordNow = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;

    const next: Partial<Record<Field, string>> = {};
    if (values.code.length !== 6) next.code = 'Enter the 6-digit code from the text message.';
    if (!values.password) next.password = 'Choose a new password.';
    else if (!meetsPasswordRules(values.password)) next.password = 'Your password doesn’t meet every requirement yet.';
    if (!values.confirm) next.confirm = 'Type your new password again.';
    else if (values.confirm !== values.password) next.confirm = 'Passwords don’t match.';

    setErrors(next);
    if (Object.keys(next).length) return;
    if (!navigator.onLine) {
      setOffline(true);
      return;
    }

    setLoading(true);
    setServerNotice(null);

    try {
      await resetPassword({
        code: values.code,
        password: values.password,
        password_confirmation: values.confirm,
        portal: 'student',
      });
      setStep('done');
    } catch (error) {
      if (isConnectionError(error)) {
        setOffline(true);
      } else if (error instanceof ApiError && error.status === 422) {
        const mapped: Partial<Record<Field, string>> = {};
        if (error.errors.code) mapped.code = error.errors.code[0];
        if (error.errors.password) mapped.password = error.errors.password[0];
        if (error.errors.password_confirmation) mapped.confirm = error.errors.password_confirmation[0];
        setErrors(Object.keys(mapped).length ? mapped : { code: serverMessage(error, 'That code is incorrect or has expired.') });
      } else {
        setServerNotice(serverMessage(error, 'We could not reset your password. Try again.'));
      }
    } finally {
      setLoading(false);
    }
  }, [loading, values]);

  return {
    step,
    values,
    errors,
    loading,
    offline,
    resendIn,
    resent,
    serverNotice,
    update,
    sendCode,
    resendCode,
    changeAccount,
    resetPassword: resetPasswordNow,
  };
}
