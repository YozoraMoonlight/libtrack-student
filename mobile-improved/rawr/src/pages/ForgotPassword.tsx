import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeftIcon, CheckCircle2Icon, HashIcon, LockIcon, UserIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { HeroAuthLayout } from '../components/auth/HeroAuthLayout';
import { FormMessage } from '../components/forms/FormMessage';
import { PasswordField } from '../components/forms/PasswordField';
import { PasswordRules } from '../components/forms/PasswordRules';
import { PrimaryButton } from '../components/forms/PrimaryButton';
import { TextField } from '../components/forms/TextField';
import { DEMO_RESET_CODE, useForgotPassword } from '../hooks/useForgotPassword';
import type { ResetStep } from '../hooks/useForgotPassword';

const ease = [0.23, 1, 0.32, 1] as const;

const copy: Record<ResetStep, {title: string;subtitle: string;}> = {
  request: {
    title: 'Reset your password',
    subtitle: 'Enter the email or 12-digit LRN you sign in with. We’ll text a 6-digit code to the mobile number on your account.'
  },
  verify: {
    title: 'Enter your code',
    subtitle: 'Type the code from the text message, then choose a new password.'
  },
  done: {
    title: 'Password reset',
    subtitle: 'Your new password is ready. Use it the next time you sign in.'
  }
};

export function ForgotPassword() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { step, values, errors, loading, offline, resendIn, resent, update, sendCode, resendCode, changeAccount, resetPassword } = useForgotPassword();

  const motionProps = {
    initial: reduceMotion ? false : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 },
    transition: { duration: 0.2, ease }
  };

  const offlineMessage =
  <AnimatePresence>
      {offline ?
    <FormMessage key="offline" type="error">
          You&apos;re offline. Connect to the internet and try again.
        </FormMessage> :
    null}
    </AnimatePresence>;


  return (
    <HeroAuthLayout title={copy[step].title} subtitle={copy[step].subtitle}>
      <AnimatePresence mode="wait" initial={false}>
        {step === 'request' ?
        <motion.form key="request" {...motionProps} onSubmit={sendCode} noValidate className="space-y-4">
            <TextField
            name="identifier"
            typingSound
            label="Email or LRN"
            placeholder="Email or 12-digit LRN"
            autoComplete="username"
            autoFocus
            leading={<UserIcon aria-hidden="true" className="h-5 w-5" />}
            className={errors.identifier ? undefined : 'bg-white'}
            value={values.identifier}
            onChange={(event) => update('identifier', event.target.value)}
            error={errors.identifier} />
          
            {offlineMessage}
            <PrimaryButton type="submit" loading={loading}>
              {loading ? 'Sending code' : 'Send code'}
            </PrimaryButton>
            <p className="pl-1 text-[13px] leading-5 text-ink/50">
              No mobile number on your account? Ask your school library to set a new password for you.
            </p>
          </motion.form> :
        null}

        {step === 'verify' ?
        <motion.form key="verify" {...motionProps} onSubmit={resetPassword} noValidate className="space-y-4">
            <FormMessage type="success">
              If this account has a mobile number on file, we texted a 6-digit code to it.
              <span className="mt-0.5 block text-xs opacity-80">
                Account: <span className="font-semibold">{values.identifier.trim()}</span> · valid for 10 minutes
              </span>
            </FormMessage>

            <TextField
            name="code"
            label="6-digit code"
            placeholder="••••••"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            leading={<HashIcon aria-hidden="true" className="h-5 w-5" />}
            className={`${errors.code ? '' : 'bg-white'} text-center text-[20px] font-semibold tracking-[0.5em] tabular-nums`}
            value={values.code}
            onChange={(event) => update('code', event.target.value)}
            error={errors.code}
            hint={errors.code ? undefined : `Demo code: ${DEMO_RESET_CODE}`} />
          

            <div className="-mt-1 flex items-center justify-between pl-1 text-[13px]">
              <span className="text-ink/50" aria-live="polite">
                {resent ? 'A new code is on its way.' : 'Didn’t get a text?'}
              </span>
              <button
              type="button"
              onClick={resendCode}
              disabled={resendIn > 0}
              className="rounded py-1.5 font-semibold text-brand-ember tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-brand-amber disabled:text-ink/40">
              
                {resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
              </button>
            </div>

            <div>
              <PasswordField
              name="new-password"
              typingSound
              label="New password"
              placeholder="Choose a new password"
              autoComplete="new-password"
              leading={<LockIcon aria-hidden="true" className="h-5 w-5" />}
              className={errors.password ? undefined : 'bg-white'}
              value={values.password}
              onChange={(event) => update('password', event.target.value)}
              error={errors.password} />
            
              <PasswordRules password={values.password} />
            </div>

            <PasswordField
            name="confirm-password"
            typingSound
            label="Confirm new password"
            placeholder="Type it again"
            autoComplete="new-password"
            leading={<LockIcon aria-hidden="true" className="h-5 w-5" />}
            className={errors.confirm ? undefined : 'bg-white'}
            value={values.confirm}
            onChange={(event) => update('confirm', event.target.value)}
            error={errors.confirm} />
          

            {offlineMessage}

            <PrimaryButton type="submit" loading={loading}>
              {loading ? 'Resetting password' : 'Reset password'}
            </PrimaryButton>
            <button
            type="button"
            onClick={changeAccount}
            className="mx-auto block rounded py-1.5 text-[14px] font-semibold text-ink/60 outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
            
              Use a different email or LRN
            </button>
          </motion.form> :
        null}

        {step === 'done' ?
        <motion.div key="done" {...motionProps} className="space-y-5" role="status">
            <div className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-ink/[0.07]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CheckCircle2Icon aria-hidden="true" className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-ink">Password changed</p>
                <p className="truncate text-[13px] text-ink/55">For {values.identifier.trim()}</p>
              </div>
            </div>
            <PrimaryButton type="button" onClick={() => navigate('/login')}>
              Back to sign in
            </PrimaryButton>
          </motion.div> :
        null}
      </AnimatePresence>

      {step !== 'done' ?
      <p className="mt-3 text-center">
          <Link
          to="/login"
          className="inline-flex items-center gap-1.5 py-2 text-[15px] font-semibold text-ink/60 outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-brand-amber">
          
            <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" />
            Back to sign in
          </Link>
        </p> :
      null}
    </HeroAuthLayout>);

}