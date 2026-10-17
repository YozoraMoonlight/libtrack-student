import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LockIcon, UserIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { DeathNotePage, type DeathNoteTrigger } from '../components/auth/DeathNotePage';
import { HeroAuthLayout } from '../components/auth/HeroAuthLayout';
import { LoginLoader } from '../components/auth/LoginLoader';
import { OwlMascot, OwlMood } from '../components/auth/OwlMascot';
import { FormMessage } from '../components/forms/FormMessage';
import { PasswordField } from '../components/forms/PasswordField';
import { PrimaryButton } from '../components/forms/PrimaryButton';
import { TextField } from '../components/forms/TextField';
import { useIsNight } from '../hooks/useIsNight';
import { useLongPress } from '../hooks/useLongPress';
import { sounds } from '../utils/sound';
import { isValidEmail, isValidLrn } from '../utils/validation';

type LoginSky = 'auto' | 'night' | 'day';
type OwlReaction = 'shocked' | 'smug';

interface LoginProps {
  sky?: LoginSky;
}

const ENCHANT_MS = 2000;
const SHOCK_MS = 1400;
const SMUG_MS = 750;
const GEASS_MS = 3200;

export function Login({ sky = 'auto' }: LoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{identifier?: string;password?: string;}>({});
  const [status, setStatus] = useState<'idle' | 'success' | 'loading' | 'offline' | 'error'>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<'none' | 'identifier' | 'password'>('none');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [enchanted, setEnchanted] = useState(false);
  const [reaction, setReaction] = useState<OwlReaction | null>(null);
  const enchantTimer = useRef<number | undefined>(undefined);
  const reactionTimer = useRef<number | undefined>(undefined);
  const [geass, setGeass] = useState(false);
  const geassTimer = useRef<number | undefined>(undefined);
  const [deathNote, setDeathNote] = useState<DeathNoteTrigger | null>(null);
  const navigate = useNavigate();
  const { login } = useAuth();
  const isNight = useIsNight();
  const night = sky === 'night' || sky === 'auto' && isNight;

  useEffect(
    () => () => {
      window.clearTimeout(enchantTimer.current);
      window.clearTimeout(reactionTimer.current);
      window.clearTimeout(geassTimer.current);
    },
    []
  );

  function handleSecretBook() {
    if (enchanted) return;
    setEnchanted(true);
    sounds.hoot();
    navigator.vibrate?.([20, 60, 20]);
    enchantTimer.current = window.setTimeout(() => setEnchanted(false), ENCHANT_MS);
  }

  function react(next: OwlReaction, duration?: number) {
    window.clearTimeout(reactionTimer.current);
    setReaction(next);
    if (duration) reactionTimer.current = window.setTimeout(() => setReaction(null), duration);
  }

  function shock() {
    react('shocked', SHOCK_MS);
    sounds.gasp();
    navigator.vibrate?.(40);
  }

  // Code Geass: long-press the owl
  const owlPress = useLongPress(700, () => {
    window.clearTimeout(geassTimer.current);
    setGeass(true);
    sounds.geass();
    navigator.vibrate?.([10, 40, 80]);
    geassTimer.current = window.setTimeout(() => setGeass(false), GEASS_MS);
  });

  // Death Note: typing "Kira" or "L" as the password (after a short pause, so prefixes don't flash)
  useEffect(() => {
    const value = password.trim();
    const hit: DeathNoteTrigger | null = value.toLowerCase() === 'kira' ? 'kira' : value === 'L' ? 'l' : null;
    if (!hit) {
      setDeathNote(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setDeathNote(hit);
      sounds.deathNote();
      react('shocked', SHOCK_MS);
    }, 600);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  const owlMood: OwlMood =
  reaction ?? (
  focusedField === 'identifier' ? 'watching' : focusedField === 'password' ? passwordVisible ? 'peeking' : 'covering' : 'idle');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === 'loading' || status === 'success') return;
    const nextErrors: typeof errors = {};
    if (!identifier.trim()) nextErrors.identifier = 'Enter your email address or 12-digit LRN.';else
    if (!isValidEmail(identifier) && !isValidLrn(identifier)) nextErrors.identifier = 'Use a valid email or a 12-digit LRN.';
    if (!password) nextErrors.password = 'Enter your password.';else
    if (password.length < 8) nextErrors.password = 'Password must be at least 8 characters.';
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length) {
      shock();
      return;
    }

    if (!navigator.onLine) {
      setStatus('offline');
      shock();
      return;
    }

    setStatus('loading');
    const message = await login(identifier.trim(), password);
    if (message) {
      setFormError(message);
      setStatus('error');
      shock();
      return;
    }

    setStatus('success');
    react('smug');
    sounds.smug();
    await new Promise((resolve) => setTimeout(resolve, SMUG_MS));
    navigate('/app');
  }

  return (
    <HeroAuthLayout
      title="Welcome back"
      subtitle="Sign in with your email or LRN to access your library account."
      onSecretBook={handleSecretBook}
      night={night}>
      
      <form className="space-y-4 pt-10" onSubmit={handleSubmit} noValidate>
        <div className="relative">
          <OwlMascot
            mood={owlMood}
            enchanted={enchanted}
            geass={geass}
            lookProgress={identifier.length / 28}
            className="pointer-events-none absolute left-1/2 z-10 w-[110px] -translate-x-1/2"
            style={{ top: -60 }} />
          
          {/* Hidden hit area over the owl's head: long-press to activate Geass */}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Owl"
            {...owlPress.handlers}
            className="absolute left-1/2 z-20 h-[52px] w-[84px] -translate-x-1/2 cursor-default select-none bg-[transparent] [-webkit-touch-callout:none]"
            style={{ top: -58 }} />
          
          <AnimatePresence>
            {geass ?
            <motion.div
              role="status"
              className="pointer-events-none absolute left-1/2 z-30 w-[250px] -translate-x-1/2 rounded-2xl bg-[#121212] px-4 py-3 text-center text-[13px] font-semibold leading-5 text-[#f5f5f5] shadow-card"
              style={{ top: -132, transformOrigin: '50% 100%' }}
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
              
                <span className="text-[#ff5a6e]">Lelouch vi Britannia commands you…</span>
                <br />
                return your books on time.
                <span aria-hidden="true" className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-[#121212]" />
              </motion.div> :
            null}
          </AnimatePresence>
          <TextField
            name="identifier"
            typingSound
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
            error={errors.identifier}
            onFocus={() => setFocusedField('identifier')}
            onBlur={() => setFocusedField('none')} />
          
        </div>
        <div onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField('none')}>
          <PasswordField
            name="password"
            typingSound
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
            error={errors.password}
            onVisibleChange={setPasswordVisible} />
          
        </div>

        <AnimatePresence>{deathNote ? <DeathNotePage key={deathNote} trigger={deathNote} /> : null}</AnimatePresence>

        <AnimatePresence mode="wait">
          {status === 'offline' ?
          <FormMessage key="offline" type="error">You&apos;re offline. Connect to the internet to sign in.</FormMessage> :
          status === 'error' && formError ?
          <FormMessage key="error" type="error">{formError}</FormMessage> :
          null}
        </AnimatePresence>

        <PrimaryButton type="submit" disabled={status === 'loading' || status === 'success'} className="!mt-5">
          Sign in
        </PrimaryButton>
      </form>

      {status === 'loading' ? <LoginLoader /> : null}

      <div className="mt-3 space-y-1 text-center text-[15px] text-ink/55">
        <p>
          <Link to="/forgot-password" className="inline-block py-2 font-semibold text-ink/70 underline-offset-4 hover:text-ink focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
            Forgot your password?
          </Link>
        </p>
        <p>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="inline-block py-2 font-bold text-brand-ember underline-offset-4 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
            Create one
          </Link>
        </p>
      </div>
    </HeroAuthLayout>);

}