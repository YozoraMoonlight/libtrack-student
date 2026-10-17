import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Eye, EyeOff, Crown } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

interface SuperAdminLoginProps {
    flash?: { success?: string; error?: string };
}

export default function SuperAdminLogin({ flash }: SuperAdminLoginProps) {
    const { data, setData, post, processing, errors } = useForm({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'error' | null; message: string | null }>({ type: null, message: null });

    useEffect(() => {
        if (flash?.success) setFlashMessage({ type: 'success', message: flash.success });
        else if (flash?.error) setFlashMessage({ type: 'error', message: flash.error });
        else setFlashMessage({ type: null, message: null });
    }, [flash]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        setFlashMessage({ type: null, message: null });
        post(route('superadmin.auth.login.store'), {
            onError: (errs) => { if (errs.auth) setAuthError(errs.auth); },
        });
    };

    return (
        <>
            <Head title="Super Admin Portal - LIBTRACK">
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=General+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </Head>

            <style>{`
                .font-display { font-family: 'DM Serif Display', serif; }
                .font-body { font-family: 'General Sans', sans-serif; }
            `}</style>

            <div className="font-body relative flex min-h-screen items-center justify-center bg-[#080705] px-4 py-10">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(245,158,11,0.18),transparent)]" />
                <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }} />
                <div className="pointer-events-none absolute -top-40 left-1/2 h-72 w-[80%] -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl" />

                <div className="absolute top-6 left-6">
                    <Link href={route('home')} className="inline-flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-amber-200">
                        <ArrowLeft className="h-4 w-4" />
                        Back to home
                    </Link>
                </div>

                <div className="relative w-full max-w-md">
                    <div className="overflow-hidden rounded-2xl border border-amber-500/[0.15] bg-[#100d09] shadow-2xl shadow-amber-900/30">
                        <div className="border-b border-amber-500/10 bg-gradient-to-r from-amber-950/50 via-amber-900/25 to-transparent px-8 py-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/10">
                                    <Crown className="h-5 w-5 text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-400 uppercase">Platform Owner</p>
                                    <h1 className="font-display text-2xl text-white">Super Admin Portal</h1>
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            <p className="mb-6 text-sm leading-relaxed text-stone-400">
                                Sign in with your platform-owner credentials. School administrators sign in via the{' '}
                                <Link href={route('admin.auth.login')} className="font-medium text-amber-400 hover:text-amber-300">Admin Portal</Link>.
                            </p>

                            {flashMessage.message && (
                                <Alert variant={flashMessage.type === 'error' ? 'destructive' : 'default'} className="mb-5">
                                    <AlertDescription>{flashMessage.message}</AlertDescription>
                                </Alert>
                            )}

                            {authError && (
                                <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{authError}</div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-sm font-medium text-stone-300">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="superadmin@libtrack.io"
                                        className="h-11 rounded-xl border-white/[0.08] bg-white/[0.03] text-white placeholder:text-stone-600 focus:border-amber-500/60 focus:ring-amber-500/20"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                    />
                                    {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="password" className="text-sm font-medium text-stone-300">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter your password"
                                            className="h-11 rounded-xl border-white/[0.08] bg-white/[0.03] pr-11 text-white placeholder:text-stone-600 focus:border-amber-500/60 focus:ring-amber-500/20"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            autoComplete="current-password"
                                            autoCapitalize="off"
                                            autoCorrect="off"
                                            spellCheck={false}
                                        />
                                        <button type="button" className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-stone-500 hover:text-stone-300" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-sm text-red-400">{errors.password}</p>}
                                </div>

                                <Button type="submit" className="h-11 w-full rounded-xl bg-amber-500 font-semibold text-stone-900 shadow-lg shadow-amber-900/30 hover:bg-amber-400" disabled={processing}>
                                    {processing ? 'Authenticating...' : 'Access Super Admin Portal'}
                                </Button>
                            </form>

                            <div className="mt-6 flex items-center gap-3 text-[11px] text-stone-500">
                                <div className="h-px flex-1 bg-white/[0.06]" />
                                <span>Platform owner only</span>
                                <div className="h-px flex-1 bg-white/[0.06]" />
                            </div>
                        </div>
                    </div>

                    <p className="mt-4 text-center text-xs text-stone-600">All access is audited. LIBTRACK Library Management System.</p>
                </div>
            </div>
        </>
    );
}
