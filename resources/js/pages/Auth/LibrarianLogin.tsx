import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Eye, EyeOff, Library } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

interface LibrarianLoginProps {
    flash?: { success?: string; error?: string };
}

export default function LibrarianLogin({ flash }: LibrarianLoginProps) {
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
        post(route('librarian.auth.login.store'), {
            onError: (errs) => { if (errs.auth) setAuthError(errs.auth); },
        });
    };

    return (
        <>
            <Head title="Librarian Sign In - LIBTRACK">
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
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0d1f24] via-[#0e1f23] to-[#091418]" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(45,212,191,0.18),transparent)]" />
                    <div className="absolute top-[20%] right-[10%] h-64 w-64 rounded-full border border-teal-400/[0.07]" />
                    <div className="absolute bottom-[25%] left-[15%] h-40 w-40 rounded-full border border-teal-400/[0.05]" />
                    <div className="relative flex h-full flex-col items-center justify-center px-12">
                        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/[0.1]">
                            <Library className="h-8 w-8 text-teal-300" />
                        </div>
                        <h1 className="font-display text-center text-5xl text-white">
                            Manage your<br />
                            <span className="text-teal-300">circulation desk.</span>
                        </h1>
                        <p className="mt-6 max-w-sm text-center text-stone-400 leading-relaxed">
                            Issue, return, and monitor borrowings. Keep your school's library moving.
                        </p>
                    </div>
                </div>

                <div className="flex w-full flex-col bg-[#f8fafa] lg:w-1/2">
                    <div className="flex items-center justify-between px-6 py-4 sm:px-10">
                        <Link href={route('home')} className="flex items-center gap-2 text-stone-400 transition-colors hover:text-stone-700">
                            <ArrowLeft className="h-4 w-4" />
                            <span className="text-sm font-medium">Back</span>
                        </Link>
                        <div className="flex items-center gap-2 lg:hidden">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700">
                                <Library className="h-4 w-4 text-teal-200" />
                            </div>
                            <span className="font-bold text-stone-900">LIBTRACK</span>
                        </div>
                        <div />
                    </div>

                    <div className="flex flex-1 items-center justify-center px-6 sm:px-10">
                        <div className="w-full max-w-sm">
                            <div className="mb-8">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-700">Librarian portal</p>
                                <h2 className="font-display mt-1 text-3xl text-stone-900">Sign in</h2>
                                <p className="mt-2 text-stone-500">Enter your librarian credentials to manage circulation.</p>
                            </div>

                            {flashMessage.message && (
                                <Alert variant={flashMessage.type === 'error' ? 'destructive' : 'default'} className="mb-5">
                                    <AlertDescription>{flashMessage.message}</AlertDescription>
                                </Alert>
                            )}

                            {authError && (
                                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{authError}</div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-stone-700 font-medium">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="librarian@school.edu"
                                        className="h-11 rounded-xl border-stone-200 bg-white focus:border-teal-500 focus:ring-teal-500/20"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                    />
                                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="password" className="text-stone-700 font-medium">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter your password"
                                            className="h-11 rounded-xl border-stone-200 bg-white pr-11 focus:border-teal-500 focus:ring-teal-500/20"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            autoComplete="current-password"
                                            autoCapitalize="off"
                                            autoCorrect="off"
                                            spellCheck={false}
                                        />
                                        <button type="button" className="absolute inset-y-0 right-0 z-10 flex items-center pr-3 text-stone-400 hover:text-stone-600" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                                </div>

                                <Button type="submit" className="h-11 w-full rounded-xl bg-teal-700 text-white font-semibold hover:bg-teal-800 shadow-md shadow-teal-900/10" disabled={processing}>
                                    {processing ? 'Signing in...' : 'Sign in as librarian'}
                                </Button>
                            </form>

                            <p className="mt-6 text-center text-sm text-stone-500">
                                New librarian?{' '}
                                <Link href={route('auth.register')} className="font-semibold text-teal-700 hover:text-teal-800">Register here</Link>
                            </p>

                            <div className="mt-8 border-t border-stone-200 pt-5 text-center space-y-2">
                                <Link href={route('auth.login')} className="block text-xs text-stone-400 hover:text-stone-700">Student? Use the student portal →</Link>
                                <Link href={route('admin.auth.login')} className="block text-xs text-stone-400 hover:text-stone-700">Admin? Use the admin portal →</Link>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 text-center text-xs text-stone-400 sm:px-10">LIBTRACK Library Management System</div>
                </div>
            </div>
        </>
    );
}
