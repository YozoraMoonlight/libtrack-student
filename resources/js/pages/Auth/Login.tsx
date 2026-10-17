import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, Link, useForm } from '@inertiajs/react';
import { BookOpen, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

interface LoginProps {
    flash?: {
        success?: string;
        error?: string;
    };
    isMobileApp?: boolean;
}

export default function Login({ flash, isMobileApp = false }: LoginProps) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [flashMessage, setFlashMessage] = useState<{
        type: 'success' | 'error' | null;
        message: string | null;
    }>({ type: null, message: null });

    useEffect(() => {
        if (flash?.success) {
            setFlashMessage({ type: 'success', message: flash.success });
        } else if (flash?.error) {
            setFlashMessage({ type: 'error', message: flash.error });
        } else {
            setFlashMessage({ type: null, message: null });
        }
    }, [flash]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        setFlashMessage({ type: null, message: null });

        post(route('auth.login.store'), {
            onError: (errors) => {
                if (errors.auth) {
                    setAuthError(errors.auth);
                }
            },
        });
    };

    return (
        <>
            <Head title="Log in - LIBTRACK">
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=General+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>

            <style>{`
                .font-display { font-family: 'DM Serif Display', serif; }
                .font-body { font-family: 'General Sans', sans-serif; }
            `}</style>

            <div className="font-body flex min-h-screen">
                {/* Left Panel — Branding */}
                <div className="relative hidden w-1/2 overflow-hidden lg:block">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#1a1612] via-[#1e1a15] to-[#15120e]" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(180,130,50,0.15),transparent)]" />
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '60px 60px',
                    }} />

                    {/* Decorative circles */}
                    <div className="absolute top-[20%] right-[10%] h-64 w-64 rounded-full border border-amber-500/[0.07]" />
                    <div className="absolute bottom-[25%] left-[15%] h-40 w-40 rounded-full border border-amber-500/[0.05]" />
                    <div className="absolute top-[60%] right-[30%] h-24 w-24 rounded-full bg-amber-500/[0.04] blur-2xl" />

                    <div className="relative flex h-full flex-col items-center justify-center px-12">
                        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/[0.1]">
                            <BookOpen className="h-8 w-8 text-amber-400" />
                        </div>
                        <h1 className="font-display text-center text-5xl text-white">
                            Welcome back<br />
                            <span className="text-amber-400">to LIBTRACK.</span>
                        </h1>
                        <p className="mt-6 max-w-sm text-center text-stone-400 leading-relaxed">
                            Sign in to manage your library, track borrowings, and access real-time analytics.
                        </p>

                        {/* Decorative book spines */}
                        <div className="mt-16 flex items-end gap-2">
                            {[
                                { h: 'h-20', bg: 'bg-amber-800/40' },
                                { h: 'h-24', bg: 'bg-emerald-800/40' },
                                { h: 'h-16', bg: 'bg-stone-600/40' },
                                { h: 'h-28', bg: 'bg-amber-700/40' },
                                { h: 'h-20', bg: 'bg-teal-800/40' },
                                { h: 'h-24', bg: 'bg-stone-700/40' },
                                { h: 'h-18', bg: 'bg-amber-900/40' },
                            ].map((spine, i) => (
                                <div key={i} className={`${spine.h} w-3 ${spine.bg} rounded-t-sm`} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel — Form */}
                <div className="flex w-full flex-col bg-[#faf9f7] lg:w-1/2">
                    {/* Top bar */}
                    <div className="flex items-center justify-between px-6 py-4 sm:px-10">
                        <Link href={route('home')} className="flex items-center gap-2 text-stone-400 transition-colors hover:text-stone-700">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="text-sm font-medium">Back</span>
                        </Link>
                        <div className="flex items-center gap-2 lg:hidden">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900">
                                <BookOpen className="h-4 w-4 text-amber-400" />
                            </div>
                            <span className="font-bold text-stone-900">LIBTRACK</span>
                        </div>
                        <div />
                    </div>

                    {/* Form centered */}
                    <div className="flex flex-1 items-center justify-center px-6 sm:px-10">
                        <div className="w-full max-w-sm">
                            <div className="mb-8">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-600">
                                    {isMobileApp ? 'Student Mobile App' : 'Student & Librarian Portal'}
                                </p>

                                <h2 className="font-display mt-1 text-3xl text-stone-900">Sign in</h2>

                                <p className="mt-2 text-stone-500">
                                    {isMobileApp
                                        ? 'Students sign in here to access the LIBTRACK mobile app.'
                                        : 'Students and librarians sign in here to access LIBTRACK.'}
                                </p>
                            </div>

                            {flashMessage.message && (
                                <Alert variant={flashMessage.type === 'error' ? 'destructive' : 'default'} className="mb-5">
                                    <AlertDescription>{flashMessage.message}</AlertDescription>
                                </Alert>
                            )}

                            {authError && (
                                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                    {authError}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-stone-700 font-medium">Email or LRN</Label>
                                    <Input
                                        id="email"
                                        // type="text", not "email": students registered in
                                        // bulk sign in with their 12-digit LRN.
                                        type="text"
                                        inputMode="email"
                                        autoComplete="username"
                                        autoCapitalize="off"
                                        autoCorrect="off"
                                        spellCheck={false}
                                        placeholder="you@example.com or 123456789012"
                                        className="h-11 rounded-xl border-stone-200 bg-white focus:border-amber-500 focus:ring-amber-500/20"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                    />
                                    <p className="text-xs text-stone-500">Students may sign in with their 12-digit LRN.</p>
                                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="password" className="text-stone-700 font-medium">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter your password"
                                            className="h-11 rounded-xl border-stone-200 bg-white pr-11 focus:border-amber-500 focus:ring-amber-500/20"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            autoComplete="current-password"
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
                                    {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                                </div>

                                <Button
                                    type="submit"
                                    className="h-11 w-full rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800 shadow-md shadow-stone-900/10"
                                    disabled={processing}
                                >
                                    {processing ? 'Signing in...' : 'Sign in'}
                                </Button>
                            </form>

                            <p className="mt-6 text-center text-sm text-stone-500">
                                Don't have an account?{' '}
                                <Link href={route('auth.register')} className="font-semibold text-amber-600 hover:text-amber-700">
                                    Create one
                                </Link>
                            </p>

                            <div className="mt-8 border-t border-stone-200 pt-5 text-center">
                                <Link
                                    href={route('admin.auth.login')}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-400 transition-colors hover:text-stone-700"
                                >
                                    <span>Administrator? Access the Admin Portal</span>
                                    <span aria-hidden="true">→</span>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 text-center text-xs text-stone-400 sm:px-10">
                        LIBTRACK Library Management System
                    </div>
                </div>
            </div>
        </>
    );
}
