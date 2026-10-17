import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { router, useForm, usePage } from '@inertiajs/react';
import { Loader2, ShieldCheck } from 'lucide-react';

export interface OtpPending {
    /** "0917••••15" — never the full number, it is only a reminder of where the code went. */
    phone_masked: string;
    /** Who is about to be created, e.g. "Albert Palao (School Admin)". */
    summary: string;
    expires_at?: string | null;
}

interface Props {
    pending: OtpPending;
    /** Ziggy route names for the three actions on the pending account. */
    verifyRoute: string;
    resendRoute: string;
    cancelRoute: string;
    /** What is waiting to be created, for the heading — "school admin", "student", … */
    noun?: string;
}

/**
 * The confirmation step for an account a staff member is creating for someone
 * else: the account exists only after the code texted to the number on the form
 * is typed back in here.
 *
 * A plain fixed overlay rather than a Radix Dialog on purpose — every button in
 * here starts an Inertia visit, and a portalled modal that unmounts mid-visit is
 * what left the page with a stuck pointer-events lock before.
 */
export function OtpVerification({ pending, verifyRoute, resendRoute, cancelRoute, noun = 'account' }: Props) {
    const { data, setData, post, processing, errors } = useForm({ code: '' });
    // These pages have no flash banner of their own, and "the SMS did not go
    // out" is the one thing the person staring at this box has to be told.
    const { flash } = usePage().props as {
        flash?: { success?: string; info?: string; error?: string };
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route(verifyRoute), { preserveScroll: true });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-stone-900">Confirm this {noun}</h2>
                        <p className="text-xs text-stone-500">
                            We texted a 6-digit code to{' '}
                            <span className="font-semibold text-stone-700">{pending.phone_masked}</span>.
                        </p>
                    </div>
                </div>

                <div className="mt-4 rounded-lg border bg-stone-50 px-3 py-2 text-sm text-stone-700">
                    {pending.summary}
                </div>

                {flash?.error && (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{flash.error}</p>
                )}
                {flash?.info && (
                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{flash.info}</p>
                )}
                {!flash?.error && flash?.success && (
                    <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{flash.success}</p>
                )}

                <form onSubmit={submit} className="mt-4 space-y-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="otp_code">Verification code</Label>
                        <Input
                            id="otp_code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            autoFocus
                            maxLength={6}
                            placeholder="000000"
                            value={data.code}
                            onChange={(e) => setData('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="h-12 text-center font-mono text-xl tracking-[0.4em]"
                        />
                        {errors.code && <p className="text-sm text-red-600">{errors.code}</p>}
                    </div>

                    <Button type="submit" disabled={processing || data.code.length !== 6} className="h-11 w-full rounded-xl">
                        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Confirm and create ${noun}`}
                    </Button>
                </form>

                <div className="mt-3 flex items-center justify-between text-xs">
                    <button
                        type="button"
                        className="font-semibold text-stone-600 underline hover:text-stone-900"
                        onClick={() => router.post(route(resendRoute))}
                    >
                        Resend code
                    </button>
                    <button
                        type="button"
                        className="text-stone-500 hover:text-red-600"
                        onClick={() => router.post(route(cancelRoute))}
                    >
                        Cancel
                    </button>
                </div>

                <p className="mt-3 text-[11px] leading-relaxed text-stone-400">
                    Nothing is saved until the code is confirmed. Cancelling discards the details and returns you to the
                    empty form.
                </p>
            </div>
        </div>
    );
}
