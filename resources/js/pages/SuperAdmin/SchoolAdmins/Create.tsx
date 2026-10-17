import { OtpVerification, type OtpPending } from '@/components/otp-verification';
import { PasswordChecklist } from '@/components/password-checklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SuperAdminLayout from '@/layouts/superadmin-layout';
import { PHONE_MAX_LENGTH, PHONE_PATTERN, PHONE_PLACEHOLDER, formatPhoneInput } from '@/lib/phone';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface School { id: number; name: string; code: string }

const lettersOnly = (value: string) => value.replace(/[^A-Za-z\s'.\-]/g, '');

interface Props {
    schools: School[];
    /** Set while an account submitted from this form waits on its SMS code. */
    otpPending?: OtpPending | null;
}

export default function CreateSchoolAdmin({ schools, otpPending }: Props) {
    const { auth } = usePage().props as any;
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { data, setData, post, processing, errors } = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        phone: '',
        school_id: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route('superadmin.school-admins.store'));
    };

    return (
        <SuperAdminLayout user={auth?.user}>
            <Head title="Add School Admin"/>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="mx-auto max-w-xl space-y-6">
                    <Link href={route('superadmin.school-admins.index')} className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800">
                        <ArrowLeft size={14}/>Back
                    </Link>
                    <h1 className="text-2xl font-bold">Add School Admin</h1>

                    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="first_name">First Name <span className="text-red-500">*</span></Label>
                                <Input
                                    id="first_name"
                                    value={data.first_name}
                                    onChange={e => setData('first_name', lettersOnly(e.target.value))}
                                    className="h-11"
                                    required
                                />
                                {errors.first_name && <p className="text-sm text-red-600">{errors.first_name}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="middle_name">Middle Name</Label>
                                <Input
                                    id="middle_name"
                                    value={data.middle_name}
                                    onChange={e => setData('middle_name', lettersOnly(e.target.value))}
                                    className="h-11"
                                />
                                {errors.middle_name && <p className="text-sm text-red-600">{errors.middle_name}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="last_name">Last Name <span className="text-red-500">*</span></Label>
                                <Input
                                    id="last_name"
                                    value={data.last_name}
                                    onChange={e => setData('last_name', lettersOnly(e.target.value))}
                                    className="h-11"
                                    required
                                />
                                {errors.last_name && <p className="text-sm text-red-600">{errors.last_name}</p>}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={data.email} onChange={e => setData('email', e.target.value)} className="h-11" required/>
                            {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="phone">Mobile Number <span className="text-red-500">*</span></Label>
                            <Input
                                id="phone"
                                type="tel"
                                inputMode="numeric"
                                maxLength={PHONE_MAX_LENGTH}
                                pattern={PHONE_PATTERN}
                                value={data.phone}
                                onChange={e => setData('phone', formatPhoneInput(e.target.value))}
                                placeholder={PHONE_PLACEHOLDER}
                                className="h-11"
                                required
                            />
                            <p className="text-xs text-stone-500">
                                A 6-digit confirmation code is texted here — the account is created once that code is
                                entered.
                            </p>
                            {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="school_id">Assigned School</Label>
                            {schools.length === 0 ? (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                                    Every school already has an assigned admin. Disable an existing admin before adding a new one.
                                </div>
                            ) : (
                                <Select value={data.school_id} onValueChange={v => setData('school_id', v)}>
                                    <SelectTrigger id="school_id" className="h-11"><SelectValue placeholder="Select a school"/></SelectTrigger>
                                    <SelectContent>
                                        {schools.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} ({s.code})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                            {errors.school_id && <p className="text-sm text-red-600">{errors.school_id}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={e => setData('password', e.target.value.replace(/\s/g, ''))}
                                    className="h-11 pr-11"
                                    required
                                    autoComplete="new-password"
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowPassword((s) => !s)}
                                    className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-700"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <PasswordChecklist value={data.password} />
                            {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="password_confirmation">Confirm Password</Label>
                            <div className="relative">
                                <Input
                                    id="password_confirmation"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={data.password_confirmation}
                                    onChange={e => setData('password_confirmation', e.target.value.replace(/\s/g, ''))}
                                    className="h-11 pr-11"
                                    required
                                    autoComplete="new-password"
                                    autoCapitalize="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                />
                                <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setShowConfirmPassword((s) => !s)}
                                    className="absolute inset-y-0 right-3 flex items-center text-stone-400 hover:text-stone-700"
                                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {data.password && data.password_confirmation && data.password !== data.password_confirmation && (
                                <p className="text-xs text-red-600">Passwords do not match.</p>
                            )}
                        </div>
                        <Button type="submit" disabled={processing || schools.length === 0} className="h-11 w-full rounded-xl bg-stone-900 hover:bg-stone-800">
                            {processing ? 'Creating...' : 'Create School Admin'}
                        </Button>
                    </form>
                </div>

                {/* The account is written only once this code is confirmed. */}
                {otpPending && (
                    <OtpVerification
                        pending={otpPending}
                        verifyRoute="superadmin.school-admins.otp.verify"
                        resendRoute="superadmin.school-admins.otp.resend"
                        cancelRoute="superadmin.school-admins.otp.cancel"
                        noun="school admin"
                    />
                )}
            </main>
        </SuperAdminLayout>
    );
}
