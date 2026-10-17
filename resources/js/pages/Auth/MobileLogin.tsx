import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, BookOpen } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

export default function MobileLogin() {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors } = useForm<{
        email: string;
        password: string;
        auth?: string;
    }>({
        email: '',
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/mobile/login');
    };

    return (
        <>
            <Head title="LIBTRACK Student Mobile Login" />

            <div className="flex min-h-screen items-center justify-center bg-[#f4f3ef] px-5">
                <div className="w-full max-w-sm rounded-3xl bg-white px-7 py-8 shadow-xl">
                    <div className="mb-5 flex justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black">
                            <BookOpen className="h-9 w-9 text-yellow-400" />
                        </div>
                    </div>

                    <h1 className="text-center text-4xl font-bold text-black">
                        LIBTRACK
                    </h1>

                    <p className="mt-2 text-center text-sm font-semibold tracking-[0.3em] text-yellow-600">
                        STUDENT MOBILE APP
                    </p>

                    <p className="mt-5 text-center text-gray-500">
                        Sign in using your student account.
                    </p>

                    <form onSubmit={submit} className="mt-8 space-y-5">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Email or LRN
                            </label>

                            <input
                                // Accepts a 12-digit LRN as well as an email —
                                // batch-registered students have a generated
                                // placeholder address they would never type.
                                type="text"
                                inputMode="email"
                                autoComplete="username"
                                autoCapitalize="off"
                                autoCorrect="off"
                                spellCheck={false}
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="you@example.com or 123456789012"
                                className="w-full rounded-xl border border-gray-300 px-4 py-4"
                            />

                            {errors.email && (
                                <p className="mt-2 text-sm text-red-600">
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Password
                            </label>

                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={(e) =>
                                        setData('password', e.target.value)
                                    }
                                    placeholder="Enter your password"
                                    className="w-full rounded-xl border border-gray-300 px-4 py-4 pr-12"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>

                            {errors.password && (
                                <p className="mt-2 text-sm text-red-600">
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        {errors.auth && (
                            <p className="text-center text-sm text-red-600">
                                {errors.auth}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full rounded-xl bg-black py-4 font-semibold text-white disabled:opacity-50"
                        >
                            {processing ? 'Signing in...' : 'Sign in'}
                        </button>

                        <div className="text-center text-sm text-gray-600">
                            Don&apos;t have an account?{' '}
                            <Link
                                href="/mobile/register"
                                className="font-semibold text-orange-600 hover:text-orange-700"
                            >
                                Create one
                            </Link>
                        </div>
                    </form>

                    <p className="mt-9 text-center text-sm text-gray-400">
                        LIBTRACK Library Management System
                    </p>
                </div>
            </div>
        </>
    );
}