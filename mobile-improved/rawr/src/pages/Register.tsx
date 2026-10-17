import React, { FormEvent, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeftIcon, HashIcon, LockIcon, MailIcon, SearchIcon, SmartphoneIcon, UserRoundCheckIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppIcon } from '../components/app/AppIcon';
import { Bookshelf } from '../components/auth/Bookshelf';
import { ReviewRow } from '../components/auth/ReviewRow';
import { StudentIdentityCard } from '../components/auth/StudentIdentityCard';
import { FormMessage } from '../components/forms/FormMessage';
import { PasswordField } from '../components/forms/PasswordField';
import { PasswordStrength } from '../components/forms/PasswordStrength';
import { PrimaryButton } from '../components/forms/PrimaryButton';
import { TextField } from '../components/forms/TextField';
import { useLrnLookup } from '../hooks/useLrnLookup';
import { getPasswordStrength, isValidEmail, isValidLrn, isValidMobile } from '../utils/validation';

interface RegistrationErrors {
  lrn?: string;
  email?: string;
  mobile?: string;
  password?: string;
  confirmPassword?: string;
}

const ease = [0.23, 1, 0.32, 1] as const;

export function Register() {
  const reduceMotion = useReducedMotion();
  const { status: lookupStatus, student, lookup, reset } = useLrnLookup();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [values, setValues] = useState({ lrn: '', email: '', mobile: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<RegistrationErrors>({});

  const verified = lookupStatus === 'found' && student !== null;
  const showShelf = step === 1 && !complete && !verified;

  function updateValue(field: keyof typeof values, value: string) {
    const normalized = field === 'lrn' || field === 'mobile' ? value.replace(/\D/g, '') : value;
    setValues((current) => ({ ...current, [field]: normalized }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (field === 'lrn') reset();
  }

  async function handleLookup() {
    if (!isValidLrn(values.lrn)) {
      setErrors((current) => ({ ...current, lrn: 'Enter your 12-digit Learner Reference Number.' }));
      return;
    }
    await lookup(values.lrn);
  }

  function handleChangeStudent() {
    reset();
    setValues((current) => ({ ...current, lrn: '' }));
    setErrors({});
    setStep(1);
  }

  function validateAccount() {
    const next: RegistrationErrors = {};
    if (!isValidEmail(values.email)) next.email = 'Enter a valid email address.';
    if (!isValidMobile(values.mobile)) next.mobile = 'Use an 11-digit mobile number beginning with 09.';
    if (getPasswordStrength(values.password) < 2) next.password = 'Use at least 8 characters with a number or mixed-case letters.';
    if (values.confirmPassword !== values.password) next.confirmPassword = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!verified) {
      void handleLookup();
      return;
    }
    if (validateAccount()) setStep(2);
  }

  async function handleCreate() {
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setSubmitting(false);
    setComplete(true);
  }

  const stepMotion = {
    initial: reduceMotion ? false : { opacity: 0, x: 14 },
    animate: { opacity: 1, x: 0 },
    exit: reduceMotion ? { opacity: 0 } : { opacity: 0, x: -14 },
    transition: { duration: 0.24, ease }
  } as const;

  return (
    <main className="flex min-h-[100dvh] w-full justify-center bg-cream">
      <section
        aria-label="LIBTRACK student registration"
        className="flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-cream pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        
        <div className="flex flex-1 flex-col px-6 pb-8">
          <Link
            to="/login"
            className="-ml-2 inline-flex h-11 w-fit items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-brand-ember outline-none transition-colors duration-150 ease-out active:text-ink focus-visible:ring-2 focus-visible:ring-brand-amber">
            
            <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} /> Sign in
          </Link>

          <div className="mt-3 flex items-center gap-2.5">
            <AppIcon size="md" />
            <p className="text-[19px] font-extrabold tracking-[-0.04em] text-ink">LIBTRACK</p>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {complete ?
            <motion.div key="complete" {...stepMotion} className="mt-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <UserRoundCheckIcon aria-hidden="true" className="h-7 w-7" />
                </div>
                <h1 className="mt-6 text-[30px] font-extrabold leading-[1.1] tracking-[-0.045em] text-ink">Account created</h1>
                <p className="mt-2 text-[15px] leading-6 text-ink/55">Welcome to LIBTRACK, {student?.name}. You can now sign in with your new student account.</p>
                <Link
                to="/login"
                className="mt-8 flex h-14 w-full items-center justify-center rounded-xl bg-ink text-base font-bold text-white outline-none transition-[background-color,transform] duration-150 ease-out active:scale-[0.985] active:bg-ink/90 focus-visible:ring-4 focus-visible:ring-brand-amber/40">
                
                  Go to sign in
                </Link>
              </motion.div> :
            step === 1 ?
            <motion.div key="details" {...stepMotion} className="mt-8">
                <header>
                  <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.045em] text-ink">Create your account</h1>
                  <p className="mt-2 text-[15px] leading-6 text-ink/55">
                    {verified ? 'Record verified. Now set up how you’ll sign in.' : 'Match your LRN with an active student record.'}
                  </p>
                </header>

                <form className="mt-7" onSubmit={handleSubmit} noValidate>
                  <AnimatePresence initial={false} mode="wait">
                    {verified && student ?
                  <motion.div
                    key="identity"
                    initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.24, ease }}>
                    
                        <p className="mb-2 pl-1 text-[14px] font-semibold leading-none text-ink/80">Student</p>
                        <StudentIdentityCard student={student} onChange={handleChangeStudent} />
                        <p className="mt-2 pl-1 text-xs text-ink/50">LRN {values.lrn}</p>
                      </motion.div> :

                  <motion.div
                    key="lookup"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16, ease }}
                    className="space-y-3">
                    
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <TextField
                          name="lrn"
                          typingSound
                          label="LRN"
                          required
                          inputMode="numeric"
                          maxLength={12}
                          placeholder="12-digit LRN"
                          leading={<HashIcon aria-hidden="true" className="h-5 w-5" />}
                          className={errors.lrn ? undefined : 'bg-white'}
                          value={values.lrn}
                          onChange={(event) => updateValue('lrn', event.target.value)}
                          error={errors.lrn}
                          hint={lookupStatus === 'idle' ? 'Demo LRN: 123456789012' : undefined} />
                        
                          </div>
                          <button
                        type="submit"
                        disabled={lookupStatus === 'loading'}
                        className="mt-[22px] flex h-14 shrink-0 items-center gap-2 rounded-2xl bg-ink px-4 text-[15px] font-bold text-white outline-none transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] active:bg-ink/90 focus-visible:ring-4 focus-visible:ring-brand-amber/40 disabled:cursor-wait disabled:bg-ink/60">
                        
                            <SearchIcon aria-hidden="true" className={lookupStatus === 'loading' ? 'h-4 w-4 animate-pulse' : 'h-4 w-4'} strokeWidth={2.5} />
                            {lookupStatus === 'loading' ? 'Finding' : 'Find'}
                          </button>
                        </div>
                        {lookupStatus === 'not-found' ? <FormMessage type="error">No active student record matches that LRN.</FormMessage> : null}
                      </motion.div>
                  }
                  </AnimatePresence>

                  <AnimatePresence initial={false}>
                    {verified ?
                  <motion.div
                    key="account-fields"
                    initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28, ease, delay: reduceMotion ? 0 : 0.1 }}
                    className="-mx-1 overflow-hidden">
                    
                        <div className="space-y-4 px-1 pb-1 pt-6">
                          <TextField typingSound name="email" type="email" label="Email" required autoComplete="email" placeholder="you@example.com" leading={<MailIcon aria-hidden="true" className="h-5 w-5" />} className={errors.email ? undefined : 'bg-white'} value={values.email} onChange={(event) => updateValue('email', event.target.value)} error={errors.email} />
                          <TextField typingSound name="mobile" label="Mobile number" required inputMode="tel" autoComplete="tel" maxLength={11} placeholder="09XXXXXXXXX" leading={<SmartphoneIcon aria-hidden="true" className="h-5 w-5" />} className={errors.mobile ? undefined : 'bg-white'} value={values.mobile} onChange={(event) => updateValue('mobile', event.target.value)} error={errors.mobile} />
                          <div>
                            <PasswordField typingSound name="new-password" label="Password" required autoComplete="new-password" placeholder="Create a strong password" leading={<LockIcon aria-hidden="true" className="h-5 w-5" />} className={errors.password ? undefined : 'bg-white'} value={values.password} onChange={(event) => updateValue('password', event.target.value)} error={errors.password} />
                            <PasswordStrength password={values.password} />
                          </div>
                          <PasswordField typingSound name="confirm-password" label="Confirm password" required autoComplete="new-password" placeholder="Re-enter your password" leading={<LockIcon aria-hidden="true" className="h-5 w-5" />} className={errors.confirmPassword ? undefined : 'bg-white'} value={values.confirmPassword} onChange={(event) => updateValue('confirmPassword', event.target.value)} error={errors.confirmPassword} />
                          <PrimaryButton type="submit" className="!mt-6">Review details</PrimaryButton>
                        </div>
                      </motion.div> :
                  null}
                  </AnimatePresence>
                </form>

                <p className="mt-4 text-center text-[15px] text-ink/55">
                  Already have an account?{' '}
                  <Link to="/login" className="inline-block py-2 font-bold text-brand-ember focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                    Sign in
                  </Link>
                </p>
              </motion.div> :

            <motion.div key="review" {...stepMotion} className="mt-8">
                <header>
                  <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.045em] text-ink">Review your details</h1>
                  <p className="mt-2 text-[15px] leading-6 text-ink/55">Confirm that this account belongs to the correct student.</p>
                </header>

                {student ?
              <div className="mt-7">
                    <StudentIdentityCard student={student} onChange={handleChangeStudent} />
                  </div> :
              null}

                <dl className="mt-5 divide-y divide-ink/10 rounded-2xl border-[1.5px] border-ink/10 bg-white px-4">
                  <ReviewRow label="LRN" value={values.lrn} />
                  <ReviewRow label="Email" value={values.email} />
                  <ReviewRow label="Mobile" value={values.mobile} />
                </dl>
                <div className="mt-8 space-y-3">
                  <PrimaryButton type="button" loading={submitting} onClick={handleCreate}>Create account</PrimaryButton>
                  <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="h-12 w-full rounded-xl text-sm font-semibold text-ink/55 outline-none transition-colors duration-150 ease-out active:text-ink focus-visible:ring-2 focus-visible:ring-brand-amber">
                  
                    Edit details
                  </button>
                </div>
              </motion.div>
            }
          </AnimatePresence>
        </div>

        <AnimatePresence initial={false}>
          {showShelf ?
          <motion.div
            key="shelf"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.24, ease }}>
            
              <Bookshelf />
            </motion.div> :
          null}
        </AnimatePresence>
      </section>
    </main>);

}