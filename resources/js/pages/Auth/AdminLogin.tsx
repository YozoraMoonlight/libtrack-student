import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

interface AdminLoginProps {
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function AdminLogin({ flash }: AdminLoginProps) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'error' | null; message: string | null }>({
        type: null,
        message: null,
    });

    useEffect(() => {
        if (flash?.success) setFlashMessage({ type: 'success', message: flash.success });
        else if (flash?.error) setFlashMessage({ type: 'error', message: flash.error });
        else setFlashMessage({ type: null, message: null });
    }, [flash]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        setFlashMessage({ type: null, message: null });

        post(route('admin.auth.login.store'), {
            onError: (errs) => {
                if (errs.auth) setAuthError(errs.auth);
            },
        });
    };

    return (
        <>
            <Head title="Admin Portal - LIBTRACK">
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link
                    href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=General+Sans:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </Head>

            <style>{`
                .font-display { font-family: 'DM Serif Display', serif; }
                .font-body { font-family: 'General Sans', sans-serif; }
            `}</style>

            <div className="font-body relative flex min-h-screen items-center justify-center bg-[#0b0a09] px-4 py-10">
                {/* Background layers */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(239,68,68,0.12),transparent)]" />
                <div
                    className="pointer-events-none absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage:
                            'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                    }}
                />
                <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[70%] -translate-x-1/2 rounded-full bg-red-500/10 blur-3xl" />

                {/* Back link */}
                <div className="absolute top-6 left-6">
                    <Link
                        href={route('home')}
                        className="inline-flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-stone-200"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to home
                    </Link>
                </div>

                {/* Card */}
                <div className="relative w-full max-w-md">
                    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14110e] shadow-2xl shadow-black/40">
                        {/* Header strip */}
                        <div className="border-b border-white/[0.06] bg-gradient-to-r from-red-950/40 via-red-900/20 to-transparent px-8 py-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
                                    <ShieldCheck className="h-5 w-5 text-red-400" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold tracking-[0.2em] text-red-400 uppercase">
                                        Restricted Access
                                    </p>
                                    <h1 className="font-display text-2xl text-white">Admin & Super Admin Portal</h1>
                                </div>
                            </div>
                        </div>

                        {/* Form body */}
                        <div className="p-8">
                            <p className="mb-6 text-sm leading-relaxed text-stone-400">
                                Sign in as a super admin or school administrator. Students and librarians use the{' '}
                                <Link href={route('auth.login')} className="font-medium text-stone-200 hover:text-white">Student & Librarian portal</Link>.
                            </p>

                            {flashMessage.message && (
                                <Alert variant={flashMessage.type === 'error' ? 'destructive' : 'default'} className="mb-5">
                                    <AlertDescription>{flashMessage.message}</AlertDescription>
                                </Alert>
                            )}

                            {authError && (
                                <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                    {authError}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-sm font-medium text-stone-300">
                                        Admin Email
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="admin@libtrack.io"
                                        className="h-11 rounded-xl border-white/[0.08] bg-white/[0.03] text-white placeholder:text-stone-600 focus:border-red-500/60 focus:ring-red-500/20"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                    />
                                    {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="password" className="text-sm font-medium text-stone-300">
                                        Password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter your password"
                                            className="h-11 rounded-xl border-white/[0.08] bg-white/[0.03] pr-11 text-white placeholder:text-stone-600 focus:border-red-500/60 focus:ring-red-500/20"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            autoComplete="current-password"
                                            autoCapitalize="off"
                                            autoCorrect="off"
                                            spellCheck={false}
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-stone-500 hover:text-stone-300"
                                            onClick={() => setShowPassword(!showPassword)}
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-sm text-red-400">{errors.password}</p>}
                                </div>

                                <Button
                                    type="submit"
                                    className="h-11 w-full rounded-xl bg-red-600 font-semibold text-white shadow-lg shadow-red-900/30 hover:bg-red-500"
                                    disabled={processing}
                                >
                                    {processing ? 'Authenticating...' : 'Access Admin Portal'}
                                </Button>
                            </form>

                        </div>
                    </div>

                    <p className="mt-4 text-center text-xs text-stone-600">
                        Unauthorized access attempts are logged. LIBTRACK Library Management System.
                    </p>
                </div>
            </div>
        </>
    );
}
