import { PasswordChecklist } from '@/components/password-checklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PHONE_MAX_LENGTH, PHONE_PATTERN, PHONE_PLACEHOLDER, formatPhoneInput } from '@/lib/phone';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { BookOpen, ArrowLeft, Eye, EyeOff, ShieldCheck, Search, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';

interface PendingVerification {
    phone_masked: string;
    expires_at: string | null;
    name?: string | null;
    school_name?: string | null;
    lrn?: string | null;
    role?: 'student';
}


interface FlashBag {
    success?: string;
    error?: string;
    info?: string;
}

interface RegisterProps {
    pending: PendingVerification | null;
}

export default function Register({ pending }: RegisterProps) {
    const { props } = usePage<{ flash?: FlashBag }>();
    const flash = props.flash ?? {};

    const step: 1 | 2 = pending ? 2 : 1;

    return (
        <>
            <Head title="Register - LIBTRACK">
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=General+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>

            <style>{`
                .font-display { font-family: 'DM Serif Display', serif; }
                .font-body { font-family: 'General Sans', sans-serif; }
            `}</style>

            <div className="font-body flex min-h-screen">
                <div className="relative hidden w-1/2 overflow-hidden lg:block">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1a1612] via-[#1e1a15] to-[#15120e]" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(180,130,50,0.15),transparent)]" />
                    <div className="relative flex h-full flex-col items-center justify-center px-12">
                        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/[0.1]">
                            <BookOpen className="h-8 w-8 text-amber-400" />
                        </div>
                        <h1 className="font-display text-center text-5xl text-white">
                            Start your<br />
                            <span className="text-amber-400">library journey.</span>
                        </h1>
                        <p className="mt-6 max-w-sm text-center text-stone-400 leading-relaxed">
                            Enter your LRN — we'll auto-fill your name and school from the DepEd registry.
                        </p>
                    </div>
                </div>

                <div className="flex w-full flex-col bg-[#faf9f7] lg:w-1/2">
                    <div className="flex items-center justify-between px-6 py-4 sm:px-10">
                        <Link href={route('home')} className="flex items-center gap-2 text-stone-400 transition-colors hover:text-stone-700">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="text-sm font-medium">Back</span>
                        </Link>
                    </div>

                    <div className="flex flex-1 items-center justify-center px-6 sm:px-10">
                        <div className="w-full max-w-sm">
                            <StepIndicator step={step} />

                            {flash.info && (
                                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{flash.info}</div>
                            )}
                            {flash.success && step === 2 && (
                                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{flash.success}</div>
                            )}
                            {flash.error && (
                                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{flash.error}</div>
                            )}

                            {step === 1 ? <StepOne /> : <StepTwo pending={pending!} />}

                            <p className="mt-6 text-center text-sm text-stone-500">
                                Already have an account?{' '}
                                <Link href={route('auth.login')} className="font-semibold text-amber-600 hover:text-amber-700">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>

                    <div className="px-6 py-4 text-center text-xs text-stone-400 sm:px-10">
                        LIBTRACK Library Management System
                    </div>
                </div>
            </div>
        </>
    );
}


function StepIndicator({ step }: { step: 1 | 2 }) {
    return (
        <div className="mb-6 flex items-center gap-3">
            <StepDot active={step >= 1} label="Details" index={1} />
            <div className={`h-px flex-1 ${step >= 2 ? 'bg-amber-500' : 'bg-stone-200'}`} />
            <StepDot active={step >= 2} label="Verify" index={2} />
        </div>
    );
}

function StepDot({ active, label, index }: { active: boolean; label: string; index: number }) {
    return (
        <div className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${active ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-500'}`}>
                {index}
            </div>
            <span className={`text-xs font-medium ${active ? 'text-stone-900' : 'text-stone-400'}`}>{label}</span>
        </div>
    );
}

interface LrnLookup {
    lrn: string;
    name: string;
    school_name: string;
    school_code: string;
    grade_level?: string | null;
    section?: string | null;
}

type FieldKey = 'lrn' | 'email' | 'phone' | 'password' | 'password_confirmation';

function StepOne() {
    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        lrn: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [lookup, setLookup] = useState<LrnLookup | null>(null);
    const [searching, setSearching] = useState(false);
    const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
        lrn: false,
        email: false,
        phone: false,
        password: false,
        password_confirmation: false,
    });

    const abortRef = useRef<AbortController | null>(null);
    const lookupTimerRef = useRef<number | null>(null);

    const markTouched = (key: FieldKey) => setTouched((t) => (t[key] ? t : { ...t, [key]: true }));

    const fieldError = (key: FieldKey): string | null => {
        if (errors[key]) return errors[key] as string;
        if (!touched[key]) return null;
        if (!data[key]) return 'This field is required.';
        if (key === 'password_confirmation' && data.password_confirmation !== data.password) {
            return 'Passwords do not match.';
        }
        return null;
    };

    const lookupLrn = async (lrnValue?: string) => {
        const lrn = (lrnValue ?? data.lrn).trim();
        if (lrn.length !== 12) {
            setError('lrn', 'LRN must be 12 digits.');
            return;
        }
        clearErrors('lrn');

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setSearching(true);
        try {
            const csrfMeta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
            const res = await fetch(route('auth.register.lookup-lrn'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfMeta?.content ?? '',
                },
                body: JSON.stringify({ lrn }),
                signal: controller.signal,
            });
            const json = await res.json();
            if (controller.signal.aborted) return;
            if (!res.ok || !json.ok) {
                setLookup(null);
                setError('lrn', json.reason ?? 'LRN not found in registry.');
                return;
            }
            setLookup({
                lrn: json.lrn ?? lrn,
                name: json.name,
                school_name: json.school_name,
                school_code: json.school_code,
                grade_level: json.grade_level,
                section: json.section,
            });
        } catch (err) {
            if ((err as { name?: string })?.name === 'AbortError') return;
            setError('lrn', 'Failed to look up LRN. Please try again.');
        } finally {
            if (!controller.signal.aborted) setSearching(false);
        }
    };

    useEffect(() => {
        if (lookupTimerRef.current) {
            window.clearTimeout(lookupTimerRef.current);
            lookupTimerRef.current = null;
        }
        if (data.lrn.length !== 12) return;
        if (lookup && lookup.lrn === data.lrn) return;
        lookupTimerRef.current = window.setTimeout(() => {
            lookupLrn(data.lrn);
        }, 350);
        return () => {
            if (lookupTimerRef.current) {
                window.clearTimeout(lookupTimerRef.current);
                lookupTimerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.lrn]);

    useEffect(() => () => abortRef.current?.abort(), []);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setTouched({ lrn: true, email: true, phone: true, password: true, password_confirmation: true });
        if (!lookup) {
            setError('lrn', 'Please look up your LRN first.');
            return;
        }
        post(route('auth.register.initiate'));
    };

    return (
        <>
            <div className="mb-6">
                <h2 className="font-display text-3xl text-stone-900">Create account</h2>
                <p className="mt-2 text-stone-500">Step 1 of 2 — Find your LRN to begin.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="lrn" className="text-stone-700 font-medium">
                        LRN (Learner Reference Number) <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                        <Input
                            id="lrn"
                            type="text"
                            inputMode="numeric"
                            maxLength={12}
                            placeholder="12-digit LRN"
                            className="h-11 rounded-xl border-stone-200 bg-white focus:border-amber-500 focus:ring-amber-500/20"
                            value={data.lrn}
                            onChange={(e) => {
                                const next = e.target.value.replace(/\D/g, '').slice(0, 12);
                                setData('lrn', next);
                                if (lookup && lookup.lrn !== next) setLookup(null);
                                if (errors.lrn) clearErrors('lrn');
                            }}
                            onBlur={() => markTouched('lrn')}
                            aria-invalid={fieldError('lrn') ? true : undefined}
                            required
                        />
                        <Button
                            type="button"
                            onClick={() => lookupLrn()}
                            disabled={searching || data.lrn.length !== 12}
                            className="h-11 rounded-xl bg-amber-500 text-white hover:bg-amber-600 px-4"
                        >
                            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </div>
                    {searching && !fieldError('lrn') && (
                        <p className="text-sm text-stone-500 flex items-center gap-1">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking up LRN…
                        </p>
                    )}
                    {fieldError('lrn') && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {fieldError('lrn')}
                        </p>
                    )}
                </div>

                {lookup && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-1">
                        <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                            <CheckCircle2 className="h-4 w-4"/>
                            <span>Student found</span>
                        </div>
                        <div className="text-sm text-stone-700"><span className="text-stone-500">Name:</span> {lookup.name}</div>
                        <div className="text-sm text-stone-700"><span className="text-stone-500">School:</span> {lookup.school_name} ({lookup.school_code})</div>
                        {lookup.grade_level && <div className="text-sm text-stone-700"><span className="text-stone-500">Grade/Section:</span> {lookup.grade_level} {lookup.section ? `– ${lookup.section}` : ''}</div>}
                    </div>
                )}

                <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-stone-700 font-medium">
                        Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        className="h-11 rounded-xl border-stone-200 bg-white focus:border-amber-500 focus:ring-amber-500/20"
                        value={data.email}
                        onChange={(e) => {
                            setData('email', e.target.value);
                            if (errors.email) clearErrors('email');
                        }}
                        onBlur={() => markTouched('email')}
                        aria-invalid={fieldError('email') ? true : undefined}
                        required
                    />
                    {fieldError('email') && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {fieldError('email')}
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-stone-700 font-medium">
                        Mobile Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={PHONE_MAX_LENGTH}
                        pattern={PHONE_PATTERN}
                        placeholder={PHONE_PLACEHOLDER}
                        className="h-11 rounded-xl border-stone-200 bg-white focus:border-amber-500 focus:ring-amber-500/20"
                        value={data.phone}
                        onChange={(e) => {
                            setData('phone', formatPhoneInput(e.target.value));
                            if (errors.phone) clearErrors('phone');
                        }}
                        onBlur={() => markTouched('phone')}
                        aria-invalid={fieldError('phone') ? true : undefined}
                        required
                    />
                    <p className="text-xs text-stone-500">For OTP verification and due-date reminders.</p>
                    {fieldError('phone') && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {fieldError('phone')}
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-stone-700 font-medium">
                        Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Strong password (8+ chars)"
                            className="h-11 rounded-xl border-stone-200 bg-white pr-11 focus:border-amber-500 focus:ring-amber-500/20"
                            value={data.password}
                            onChange={(e) => {
                                setData('password', e.target.value.replace(/\s/g, ''));
                                if (errors.password) clearErrors('password');
                            }}
                            onBlur={() => markTouched('password')}
                            aria-invalid={fieldError('password') ? true : undefined}
                            required
                            autoComplete="new-password"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-stone-400 hover:text-stone-600"
                            onClick={() => setShowPassword(!showPassword)}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                    <PasswordChecklist value={data.password} />
                    {fieldError('password') && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {fieldError('password')}
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="password_confirmation" className="text-stone-700 font-medium">
                        Confirm Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                        <Input
                            id="password_confirmation"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Re-enter your password"
                            className="h-11 rounded-xl border-stone-200 bg-white pr-11 focus:border-amber-500 focus:ring-amber-500/20"
                            value={data.password_confirmation}
                            onChange={(e) => {
                                setData('password_confirmation', e.target.value.replace(/\s/g, ''));
                                if (errors.password_confirmation) clearErrors('password_confirmation');
                            }}
                            onBlur={() => markTouched('password_confirmation')}
                            aria-invalid={fieldError('password_confirmation') ? true : undefined}
                            required
                            autoComplete="new-password"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                        />
                        <button
                            type="button"
                            className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-stone-400 hover:text-stone-600"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            tabIndex={-1}
                        >
                            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                    </div>
                    {fieldError('password_confirmation') && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {fieldError('password_confirmation')}
                        </p>
                    )}
                </div>

                <Button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800 shadow-md shadow-stone-900/10"
                    disabled={processing || !lookup}
                >
                    {processing ? 'Sending code...' : 'Continue'}
                </Button>
            </form>
        </>
    );
}


function StepTwo({ pending }: { pending: PendingVerification }) {
    const { data, setData, post, processing, errors } = useForm({ code: '' });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(route('auth.register.verify'));
    };

    const handleResend = () => router.post(route('auth.register.resend'));
    const handleCancel = () => router.post(route('auth.register.cancel'));

    return (
        <>
            <div className="mb-6">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
                    <ShieldCheck className="h-6 w-6 text-amber-600" />
                </div>
                <h2 className="font-display text-3xl text-stone-900">Verify your number</h2>
                <p className="mt-2 text-stone-500">
                    Step 2 of 2 — We sent a 6-digit code to <span className="font-semibold text-stone-700">{pending.phone_masked}</span>.
                </p>
                {pending.name && (
                    <div className="mt-3 rounded-lg bg-stone-100 px-3 py-2 text-sm text-stone-700">
                        <div><span className="text-stone-500">Name:</span> {pending.name}</div>
                        {pending.school_name && <div><span className="text-stone-500">School:</span> {pending.school_name}</div>}
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="code" className="text-stone-700 font-medium">Verification Code</Label>
                    <Input
                        id="code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        placeholder="123456"
                        className="h-12 rounded-xl border-stone-200 bg-white text-center text-lg tracking-[0.5em] font-semibold focus:border-amber-500 focus:ring-amber-500/20"
                        value={data.code}
                        onChange={(e) => setData('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                        required
                        autoFocus
                    />
                    {errors.code && <p className="text-sm text-red-500">{errors.code}</p>}
                </div>

                <Button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800 shadow-md shadow-stone-900/10"
                    disabled={processing || data.code.length !== 6}
                >
                    {processing ? 'Verifying...' : 'Verify & Create Account'}
                </Button>

                <div className="flex items-center justify-between text-sm">
                    <button type="button" onClick={handleCancel} className="text-stone-500 hover:text-stone-700">
                        Edit details
                    </button>
                    <button type="button" onClick={handleResend} className="font-semibold text-amber-600 hover:text-amber-700">
                        Resend code
                    </button>
                </div>
            </form>
        </>
    );
}
