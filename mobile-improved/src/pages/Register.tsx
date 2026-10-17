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
import { useAuth } from '../auth/AuthContext';
import { useLrnLookup } from '../hooks/useLrnLookup';
import { ApiError, cancelRegistration, initiateRegistration, resendRegistrationOtp, verifyRegistration } from '../api/laravel';
import { getPasswordStrength, isValidEmail, isValidLrn, isValidMobile } from '../utils/validation';

interface RegistrationErrors {
  lrn?: string;
  email?: string;
  mobile?: string;
  password?: string;
  confirmPassword?: string;
}

type RegistrationStep = 1 | 2 | 3;
const ease = [0.23, 1, 0.32, 1] as const;

export function Register() {
  const reduceMotion = useReducedMotion();
  const { status: lookupStatus, student, error: lookupError, lookup, reset } = useLrnLookup();
  const { refreshSession } = useAuth();
  const [step, setStep] = useState<RegistrationStep>(1);
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [values, setValues] = useState({ lrn: '', email: '', mobile: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [code, setCode] = useState('');
  const [phoneMasked, setPhoneMasked] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const verified = lookupStatus === 'found' && student !== null;
  const showShelf = step === 1 && !complete && !verified;
  const stepMotion = {
    initial: reduceMotion ? { opacity: 1 } : { opacity: 0, x: 14 },
    animate: { opacity: 1, x: 0 },
    exit: reduceMotion ? { opacity: 0 } : { opacity: 0, x: -14 },
    transition: { duration: 0.24, ease },
  } as const;

  function readableError(error: unknown, fallback: string): string {
    if (error instanceof ApiError) return Object.values(error.errors)[0]?.[0] || error.message || fallback;
    return fallback;
  }

  function updateValue(field: keyof typeof values, value: string) {
    const normalized = field === 'lrn' || field === 'mobile' ? value.replace(/\D/g, '') : value;
    setValues((current) => ({ ...current, [field]: normalized }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
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
    setFormError(null);
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
    if (!verified) return;
    setSubmitting(true);
    setFormError(null);
    setNotice(null);
    try {
      const page = await initiateRegistration({
        lrn: values.lrn,
        email: values.email,
        phone: values.mobile,
        password: values.password,
        password_confirmation: values.confirmPassword,
      });
      const flashError = page.flash?.error;
      if (flashError) {
        setFormError(flashError);
        return;
      }
      setPhoneMasked(page.pending?.phone_masked || 'your phone');
      setNotice(page.flash?.info || page.flash?.success || 'Verification code sent to your phone.');
      setStep(3);
    } catch (error: unknown) {
      setFormError(readableError(error, 'Unable to start registration.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setFormError('Enter the 6-digit verification code.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await verifyRegistration({
        code,
        lrn: values.lrn,
        email: values.email,
        phone: values.mobile,
        password: values.password,
        password_confirmation: values.confirmPassword,
      });
      await refreshSession();
      setComplete(true);
    } catch (error: unknown) {
      setFormError(readableError(error, 'Verification failed. Request a new code and try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setSubmitting(true);
    setFormError(null);
    try {
      const page = await resendRegistrationOtp({ lrn: values.lrn, phone: values.mobile });
      if (page.flash?.error) {
        setFormError(page.flash.error);
        return;
      }
      setPhoneMasked(page.pending?.phone_masked || 'your phone');
      setNotice(page.flash?.info || page.flash?.success || 'A new verification code was sent.');
    } catch (error: unknown) {
      setFormError(readableError(error, 'Unable to resend the verification code.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    setSubmitting(true);
    try {
      await cancelRegistration();
    } catch {
      // The local form can still be reset if the session already expired.
    }
    setValues({ lrn: '', email: '', mobile: '', password: '', confirmPassword: '' });
    setCode('');
    setNotice(null);
    setFormError(null);
    setStep(1);
    setSubmitting(false);
  }

  return (
    <main className="flex min-h-[100dvh] w-full justify-center bg-cream">
      <section aria-label="LIBTRACK student registration" className="flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-cream pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex flex-1 flex-col px-6 pb-8">
          <Link to="/login" className="-ml-2 inline-flex h-11 w-fit items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-brand-ember outline-none transition-colors duration-150 ease-out active:text-ink focus-visible:ring-2 focus-visible:ring-brand-amber">
            <ArrowLeftIcon aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} /> Sign in
          </Link>

          <div className="mt-3 flex items-center gap-2.5">
            <AppIcon size="md" />
            <p className="text-[19px] font-extrabold tracking-[-0.04em] text-ink">LIBTRACK</p>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {complete ?
              <motion.div key="complete" {...stepMotion} className="mt-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><UserRoundCheckIcon aria-hidden="true" className="h-7 w-7" /></div>
                <h1 className="mt-6 text-[30px] font-extrabold leading-[1.1] tracking-[-0.045em] text-ink">Account created</h1>
                <p className="mt-2 text-[15px] leading-6 text-ink/55">Welcome to LIBTRACK, {student?.name}. You can now sign in with your new student account.</p>
                <Link to="/login" className="mt-8 flex h-14 w-full items-center justify-center rounded-xl bg-ink text-base font-bold text-white outline-none transition-[background-color,transform] duration-150 ease-out active:scale-[0.985] active:bg-ink/90 focus-visible:ring-4 focus-visible:ring-brand-amber/40">Go to sign in</Link>
              </motion.div> :
              step === 3 ?
                <motion.div key="otp" {...stepMotion} className="mt-8">
                  <header>
                    <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.045em] text-ink">Verify your phone</h1>
                    <p className="mt-2 text-[15px] leading-6 text-ink/55">Enter the 6-digit code sent to {phoneMasked}.</p>
                  </header>
                  <form className="mt-7" onSubmit={handleVerify}>
                    <TextField name="code" label="Verification code" required inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, '')); setFormError(null); }} />
                    {formError ? <div className="mt-3"><FormMessage type="error">{formError}</FormMessage></div> : null}
                    {notice ? <p className="mt-3 text-center text-sm text-emerald-700">{notice}</p> : null}
                    <PrimaryButton type="submit" loading={submitting} className="!mt-6">Verify account</PrimaryButton>
                    <button type="button" disabled={submitting} onClick={() => void handleResend()} className="mt-3 h-12 w-full rounded-xl text-sm font-semibold text-brand-ember disabled:opacity-50">Send a new code</button>
                    <button type="button" disabled={submitting} onClick={() => void handleCancel()} className="mt-1 h-12 w-full rounded-xl text-sm font-semibold text-ink/55 disabled:opacity-50">Change phone number</button>
                  </form>
                </motion.div> :
                step === 1 ?
                  <motion.div key="details" {...stepMotion} className="mt-8">
                    <header>
                      <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.045em] text-ink">Create your account</h1>
                      <p className="mt-2 text-[15px] leading-6 text-ink/55">{verified ? 'Record verified. Now set up how you’ll sign in.' : 'Match your LRN with an active student record.'}</p>
                    </header>
                    <form className="mt-7" onSubmit={handleSubmit} noValidate>
                      <AnimatePresence initial={false} mode="wait">
                        {verified && student ?
                          <motion.div key="identity" initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.24, ease }}>
                            <p className="mb-2 pl-1 text-[14px] font-semibold leading-none text-ink/80">Student</p>
                            <StudentIdentityCard student={student} onChange={handleChangeStudent} />
                            <p className="mt-2 pl-1 text-xs text-ink/50">LRN {values.lrn}</p>
                          </motion.div> :
                          <motion.div key="lookup" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16, ease }} className="space-y-3">
                            <div className="flex items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <TextField name="lrn" label="LRN" required inputMode="numeric" maxLength={12} placeholder="12-digit LRN" leading={<HashIcon aria-hidden="true" className="h-5 w-5" />} className={errors.lrn ? undefined : 'bg-white'} value={values.lrn} onChange={(event) => updateValue('lrn', event.target.value)} error={errors.lrn} />
                              </div>
                              <button type="submit" disabled={lookupStatus === 'loading'} className="mt-[22px] flex h-14 shrink-0 items-center gap-2 rounded-2xl bg-ink px-4 text-[15px] font-bold text-white disabled:bg-ink/60">
                                <SearchIcon aria-hidden="true" className={lookupStatus === 'loading' ? 'h-4 w-4 animate-pulse' : 'h-4 w-4'} strokeWidth={2.5} />
                                {lookupStatus === 'loading' ? 'Finding' : 'Find'}
                              </button>
                            </div>
                            {lookupStatus === 'not-found' ? <FormMessage type="error">{lookupError || 'No active student record matches that LRN.'}</FormMessage> : null}
                          </motion.div>}
                      </AnimatePresence>

                      <AnimatePresence initial={false}>
                        {verified ?
                          <motion.div key="account-fields" initial={reduceMotion ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28, ease, delay: reduceMotion ? 0 : 0.1 }} className="-mx-1 overflow-hidden">
                            <div className="space-y-4 px-1 pb-1 pt-6">
                              <TextField name="email" type="email" label="Email" required autoComplete="email" placeholder="you@example.com" leading={<MailIcon aria-hidden="true" className="h-5 w-5" />} className={errors.email ? undefined : 'bg-white'} value={values.email} onChange={(event) => updateValue('email', event.target.value)} error={errors.email} />
                              <TextField name="mobile" label="Mobile number" required inputMode="tel" autoComplete="tel" maxLength={11} placeholder="09XXXXXXXXX" leading={<SmartphoneIcon aria-hidden="true" className="h-5 w-5" />} className={errors.mobile ? undefined : 'bg-white'} value={values.mobile} onChange={(event) => updateValue('mobile', event.target.value)} error={errors.mobile} />
                              <div>
                                <PasswordField name="new-password" label="Password" required autoComplete="new-password" placeholder="Create a strong password" leading={<LockIcon aria-hidden="true" className="h-5 w-5" />} className={errors.password ? undefined : 'bg-white'} value={values.password} onChange={(event) => updateValue('password', event.target.value)} error={errors.password} />
                                <PasswordStrength password={values.password} />
                              </div>
                              <PasswordField name="confirm-password" label="Confirm password" required autoComplete="new-password" placeholder="Re-enter your password" leading={<LockIcon aria-hidden="true" className="h-5 w-5" />} className={errors.confirmPassword ? undefined : 'bg-white'} value={values.confirmPassword} onChange={(event) => updateValue('confirmPassword', event.target.value)} error={errors.confirmPassword} />
                              {formError ? <FormMessage type="error">{formError}</FormMessage> : null}
                              <PrimaryButton type="submit" className="!mt-6">Review details</PrimaryButton>
                            </div>
                          </motion.div> :
                          null}
                      </AnimatePresence>
                    </form>
                    <p className="mt-4 text-center text-[15px] text-ink/55">Already have an account? <Link to="/login" className="inline-block py-2 font-bold text-brand-ember">Sign in</Link></p>
                  </motion.div> :
                  <motion.div key="review" {...stepMotion} className="mt-8">
                    <header>
                      <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.045em] text-ink">Review your details</h1>
                      <p className="mt-2 text-[15px] leading-6 text-ink/55">Confirm that this account belongs to the correct student.</p>
                    </header>
                    {student ? <div className="mt-7"><StudentIdentityCard student={student} onChange={handleChangeStudent} /></div> : null}
                    <dl className="mt-5 divide-y divide-ink/10 rounded-2xl border-[1.5px] border-ink/10 bg-white px-4">
                      <ReviewRow label="LRN" value={values.lrn} />
                      <ReviewRow label="Email" value={values.email} />
                      <ReviewRow label="Mobile" value={values.mobile} />
                    </dl>
                    {formError ? <div className="mt-4"><FormMessage type="error">{formError}</FormMessage></div> : null}
                    <div className="mt-8 space-y-3">
                      <PrimaryButton type="button" loading={submitting} onClick={() => void handleCreate()}>Create account</PrimaryButton>
                      <button type="button" onClick={() => setStep(1)} className="h-12 w-full rounded-xl text-sm font-semibold text-ink/55">Edit details</button>
                    </div>
                  </motion.div>}
          </AnimatePresence>
        </div>

        <AnimatePresence initial={false}>
          {showShelf ? <motion.div key="shelf" initial={reduceMotion ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.24, ease }}><Bookshelf /></motion.div> : null}
        </AnimatePresence>
      </section>
    </main>
  );
}
