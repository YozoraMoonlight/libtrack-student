import { OtpVerification, type OtpPending } from '@/components/otp-verification';
import { PasswordChecklist } from '@/components/password-checklist';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminLayout from '@/layouts/admin-layout';
import { PHONE_MAX_LENGTH, PHONE_PATTERN, PHONE_PLACEHOLDER, formatPhoneInput } from '@/lib/phone';
import { User } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

const lettersOnly = (value: string) => value.replace(/[^A-Za-z\s'.\-]/g, '');

interface SchoolOption {
    id: number;
    name: string;
    code: string;
}

interface CreateUserProps {
    user: User;
    schools: SchoolOption[];
    allowedRoles?: string[];
    lockedSchoolId?: number | null;
    /** Set while an account submitted from this form waits on its SMS code. */
    otpPending?: OtpPending | null;
}

export default function CreateUser({ user, schools, allowedRoles, lockedSchoolId, otpPending }: CreateUserProps) {
    const onlyLibrarian = allowedRoles && allowedRoles.length === 1 && allowedRoles[0] === 'librarian';
    const initialSchoolId = lockedSchoolId ? String(lockedSchoolId) : '';
    const initialRole = onlyLibrarian ? 'librarian' : '';
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { data, setData, post, processing, errors } = useForm<{
        first_name: string;
        middle_name: string;
        last_name: string;
        email: string;
        password: string;
        password_confirmation: string;
        user_role: string;
        student_id: string;
        phone: string;
        department: string;
        school_id: string;
    }>({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirmation: '',
        user_role: initialRole,
        student_id: '',
        phone: '',
        department: '',
        school_id: initialSchoolId,
    });

    const passwordMismatch =
        data.password.length > 0 && data.password_confirmation.length > 0 && data.password !== data.password_confirmation;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.users.store'));
    };

    const showStudentId = data.user_role === 'user';
    const showDepartment = data.user_role === 'user';
    const requiresSchool = data.user_role === 'librarian' || data.user_role === 'user';

    const pageTitle = onlyLibrarian ? 'Register Librarian' : 'Add User';

    return (
        <AdminLayout user={user}>
            <Head title={pageTitle} />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="mx-auto max-w-3xl flex flex-col gap-6">
                    {/* Page header */}
                    <div className="flex items-center gap-4">
                        <Link href={route('admin.users.index')}>
                            <Button variant="outline" size="sm">Back</Button>
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pageTitle}</h1>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{onlyLibrarian ? 'Librarian Details' : 'User Details'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                {/* Row 1: First / Middle / Last */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="first_name">First Name <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="first_name"
                                            value={data.first_name}
                                            onChange={(e) => setData('first_name', lettersOnly(e.target.value))}
                                            placeholder="First name"
                                            aria-invalid={!!errors.first_name}
                                        />
                                        {errors.first_name && <p className="text-xs text-red-500">{errors.first_name}</p>}
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="middle_name">Middle Name</Label>
                                        <Input
                                            id="middle_name"
                                            value={data.middle_name}
                                            onChange={(e) => setData('middle_name', lettersOnly(e.target.value))}
                                            placeholder="Middle name"
                                            aria-invalid={!!errors.middle_name}
                                        />
                                        {errors.middle_name && <p className="text-xs text-red-500">{errors.middle_name}</p>}
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="last_name">Last Name <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="last_name"
                                            value={data.last_name}
                                            onChange={(e) => setData('last_name', lettersOnly(e.target.value))}
                                            placeholder="Last name"
                                            aria-invalid={!!errors.last_name}
                                        />
                                        {errors.last_name && <p className="text-xs text-red-500">{errors.last_name}</p>}
                                    </div>
                                </div>

                                {/* Row 2: Email + Password */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="email@example.com"
                                            aria-invalid={!!errors.email}
                                        />
                                        {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value.replace(/\s/g, ''))}
                                                placeholder="Min 8 chars, upper/lower/number/symbol"
                                                className="pr-11"
                                                aria-invalid={!!errors.password}
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
                                        {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="password_confirmation">Confirm Password <span className="text-red-500">*</span></Label>
                                        <div className="relative">
                                            <Input
                                                id="password_confirmation"
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                value={data.password_confirmation}
                                                onChange={(e) => setData('password_confirmation', e.target.value.replace(/\s/g, ''))}
                                                placeholder="Re-enter password"
                                                className="pr-11"
                                                aria-invalid={!!errors.password_confirmation || passwordMismatch}
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
                                        {passwordMismatch && <p className="text-xs text-red-500">Passwords do not match.</p>}
                                        {errors.password_confirmation && <p className="text-xs text-red-500">{errors.password_confirmation}</p>}
                                    </div>
                                </div>

                                {/* Row 3: Role + (filled later) */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="user_role">Role <span className="text-red-500">*</span></Label>
                                        {onlyLibrarian ? (
                                            <Input
                                                id="user_role"
                                                value="Librarian"
                                                readOnly
                                                disabled
                                                className="bg-gray-50 dark:bg-gray-800"
                                            />
                                        ) : (
                                            <Select
                                                value={data.user_role}
                                                onValueChange={(v) => setData('user_role', v)}
                                            >
                                                <SelectTrigger id="user_role" aria-invalid={!!errors.user_role}>
                                                    <SelectValue placeholder="Select a role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(!allowedRoles || allowedRoles.includes('admin')) && (
                                                        <SelectItem value="admin">Admin</SelectItem>
                                                    )}
                                                    {(!allowedRoles || allowedRoles.includes('librarian')) && (
                                                        <SelectItem value="librarian">Librarian</SelectItem>
                                                    )}
                                                    {(!allowedRoles || allowedRoles.includes('user')) && (
                                                        <SelectItem value="user">Student</SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        {errors.user_role && <p className="text-xs text-red-500">{errors.user_role}</p>}
                                    </div>
                                </div>

                                {/* School — required for librarian and student */}
                                {requiresSchool && (
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="school_id">
                                            School <span className="text-red-500">*</span>
                                        </Label>
                                        {lockedSchoolId ? (
                                            <Input
                                                id="school_id"
                                                value={
                                                    schools.find((s) => s.id === lockedSchoolId)
                                                        ? `${schools.find((s) => s.id === lockedSchoolId)!.name} (${schools.find((s) => s.id === lockedSchoolId)!.code})`
                                                        : 'Your school'
                                                }
                                                readOnly
                                                disabled
                                                className="bg-gray-50 dark:bg-gray-800"
                                            />
                                        ) : (
                                            <Select
                                                value={data.school_id}
                                                onValueChange={(v) => setData('school_id', v)}
                                            >
                                                <SelectTrigger id="school_id" aria-invalid={!!errors.school_id}>
                                                    <SelectValue placeholder={schools.length === 0 ? 'No schools available — add one first' : 'Select a school'} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {schools.map((s) => (
                                                        <SelectItem key={s.id} value={String(s.id)}>
                                                            {s.name} ({s.code})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        {errors.school_id && <p className="text-xs text-red-500">{errors.school_id}</p>}
                                    </div>
                                )}

                                {/* Student ID — only when role is student */}
                                {showStudentId && (
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="student_id">Student ID</Label>
                                        <Input
                                            id="student_id"
                                            value={data.student_id}
                                            onChange={(e) => setData('student_id', e.target.value)}
                                            placeholder="e.g. 2024-00001"
                                            aria-invalid={!!errors.student_id}
                                        />
                                        {errors.student_id && <p className="text-xs text-red-500">{errors.student_id}</p>}
                                    </div>
                                )}

                                {/* Row 3: Phone (+ Department for students only) */}
                                <div className={`grid grid-cols-1 gap-4 ${showDepartment ? 'md:grid-cols-2' : ''}`}>
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="phone">Mobile Number <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={PHONE_MAX_LENGTH}
                                            pattern={PHONE_PATTERN}
                                            value={data.phone}
                                            onChange={(e) => setData('phone', formatPhoneInput(e.target.value))}
                                            placeholder={PHONE_PLACEHOLDER}
                                            aria-invalid={!!errors.phone}
                                            required
                                        />
                                        <p className="text-xs text-stone-500">
                                            A 6-digit confirmation code is texted here — the account is created once
                                            that code is entered.
                                        </p>
                                        {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                                    </div>

                                    {showDepartment && (
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="department">Department</Label>
                                            <Input
                                                id="department"
                                                value={data.department}
                                                onChange={(e) => setData('department', e.target.value)}
                                                placeholder="e.g. Computer Science"
                                                aria-invalid={!!errors.department}
                                            />
                                            {errors.department && <p className="text-xs text-red-500">{errors.department}</p>}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-3">
                                    <Link href={route('admin.users.index')}>
                                        <Button type="button" variant="outline">Cancel</Button>
                                    </Link>
                                    <Button type="submit" disabled={processing || passwordMismatch}>
                                        {processing ? (onlyLibrarian ? 'Registering...' : 'Creating...') : (onlyLibrarian ? 'Register Librarian' : 'Create User')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* The account is written only once this code is confirmed. */}
                {otpPending && (
                    <OtpVerification
                        pending={otpPending}
                        verifyRoute="admin.users.otp.verify"
                        resendRoute="admin.users.otp.resend"
                        cancelRoute="admin.users.otp.cancel"
                        noun="account"
                    />
                )}
            </main>
        </AdminLayout>
    );
}
