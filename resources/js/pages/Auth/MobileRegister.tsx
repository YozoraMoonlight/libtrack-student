import { PHONE_MAX_LENGTH, PHONE_PATTERN, PHONE_PLACEHOLDER, formatPhoneInput } from '@/lib/phone';
import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Search } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

type Pending = {
    phone_masked?: string;
    expires_at?: string;
    name?: string;
    school_name?: string;
    lrn?: string;
};

type Props = {
    pending?: Pending | null;
};

export default function MobileRegister({ pending }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [studentName, setStudentName] = useState('');
    const [schoolName, setSchoolName] = useState('');
    const [lookupError, setLookupError] = useState('');

    const { data, setData, post, processing, errors } = useForm({
        lrn: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        code: '',
    });

    const lookupLrn = async () => {
        setLookupError('');
        setStudentName('');
        setSchoolName('');

        try {
            const response = await fetch('/mobile/register/lookup-lrn', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') || '',
                },
                body: JSON.stringify({ lrn: data.lrn }),
            });

            const result = await response.json();

            if (!response.ok || !result.ok) {
                setLookupError(result.reason || 'LRN not found.');
                return;
            }

            setStudentName(result.name);
            setSchoolName(result.school_name);
        } catch {
            setLookupError('Something went wrong while searching LRN.');
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/mobile/register/initiate');
    };

    const verify: FormEventHandler = (e) => {
        e.preventDefault();
        post('/mobile/register/verify');
    };

    return (
        <>
            <Head title="Create Account" />

            <div className="min-h-screen bg-[#f5f5f5] px-6 py-6">
                <div className="mb-8">
                    <Link href="/mobile/login" className="text-gray-500">
                        ← Back
                    </Link>
                </div>

                <div className="mx-auto max-w-md">
                    <h1 className="mb-2 text-5xl font-bold">Create account</h1>

                    {!pending ? (
                        <>
                            <p className="mb-8 text-gray-600">
                                Step 1 of 2 — Find your LRN to begin.
                            </p>

                            <form onSubmit={submit}>
                                <div className="mb-5">
                                    <label className="mb-2 block">
                                        LRN *
                                    </label>

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={data.lrn}
                                            onChange={(e) =>
                                                setData('lrn', e.target.value)
                                            }
                                            placeholder="12-digit LRN"
                                            className="w-full rounded-xl border px-4 py-3"
                                        />

                                        <button
                                            type="button"
                                            onClick={lookupLrn}
                                            className="rounded-xl bg-amber-300 px-4"
                                        >
                                            <Search size={20} />
                                        </button>
                                    </div>

                                    {errors.lrn && (
                                        <p className="mt-2 text-sm text-red-600">
                                            {errors.lrn}
                                        </p>
                                    )}

                                    {lookupError && (
                                        <p className="mt-2 text-sm text-red-600">
                                            {lookupError}
                                        </p>
                                    )}

                                    {studentName && (
                                        <div className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-700">
                                            <p>{studentName}</p>
                                            <p>{schoolName}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mb-5">
                                    <label className="mb-2 block">Email *</label>
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) =>
                                            setData('email', e.target.value)
                                        }
                                        placeholder="you@example.com"
                                        className="w-full rounded-xl border px-4 py-3"
                                    />
                                    {errors.email && (
                                        <p className="mt-2 text-sm text-red-600">
                                            {errors.email}
                                        </p>
                                    )}
                                </div>

                                <div className="mb-5">
                                    <label className="mb-2 block">
                                        Mobile Number *
                                    </label>
                                    <input
                                        type="tel"
                                        inputMode="numeric"
                                        maxLength={PHONE_MAX_LENGTH}
                                        pattern={PHONE_PATTERN}
                                        value={data.phone}
                                        onChange={(e) =>
                                            setData('phone', formatPhoneInput(e.target.value))
                                        }
                                        placeholder={PHONE_PLACEHOLDER}
                                        className="w-full rounded-xl border px-4 py-3"
                                    />
                                    {errors.phone && (
                                        <p className="mt-2 text-sm text-red-600">
                                            {errors.phone}
                                        </p>
                                    )}
                                </div>

                                <div className="mb-5">
                                    <label className="mb-2 block">
                                        Password *
                                    </label>

                                    <div className="relative">
                                        <input
                                            type={
                                                showPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            value={data.password}
                                            onChange={(e) =>
                                                setData(
                                                    'password',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Strong password"
                                            className="w-full rounded-xl border px-4 py-3 pr-12"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(!showPassword)
                                            }
                                            className="absolute right-4 top-1/2 -translate-y-1/2"
                                        >
                                            {showPassword ? (
                                                <EyeOff size={20} />
                                            ) : (
                                                <Eye size={20} />
                                            )}
                                        </button>
                                    </div>

                                    {errors.password && (
                                        <p className="mt-2 text-sm text-red-600">
                                            {errors.password}
                                        </p>
                                    )}
                                </div>

                                <div className="mb-6">
                                    <label className="mb-2 block">
                                        Confirm Password *
                                    </label>

                                    <div className="relative">
                                        <input
                                            type={
                                                showConfirmPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            value={data.password_confirmation}
                                            onChange={(e) =>
                                                setData(
                                                    'password_confirmation',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Re-enter password"
                                            className="w-full rounded-xl border px-4 py-3 pr-12"
                                        />

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    !showConfirmPassword,
                                                )
                                            }
                                            className="absolute right-4 top-1/2 -translate-y-1/2"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff size={20} />
                                            ) : (
                                                <Eye size={20} />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="mb-8 w-full rounded-xl bg-black py-4 font-semibold text-white"
                                >
                                    Continue
                                </button>
                            </form>
                        </>
                    ) : (
                        <>
                            <p className="mb-6 text-gray-600">
                                Step 2 of 2 — Enter the OTP sent to{' '}
                                {pending.phone_masked}.
                            </p>

                            <form onSubmit={verify}>
                                <input
                                    type="text"
                                    value={data.code}
                                    onChange={(e) =>
                                        setData('code', e.target.value)
                                    }
                                    placeholder="6-digit OTP"
                                    className="mb-3 w-full rounded-xl border px-4 py-3"
                                />

                                {errors.code && (
                                    <p className="mb-3 text-sm text-red-600">
                                        {errors.code}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full rounded-xl bg-black py-4 font-semibold text-white"
                                >
                                    Verify Account
                                </button>
                            </form>
                        </>
                    )}

                    <div className="mt-8 text-center">
                        <span className="text-gray-600">
                            Already have an account?{' '}
                        </span>
                        <Link
                            href="/mobile/login"
                            className="font-semibold text-orange-600"
                        >
                            Sign in
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}