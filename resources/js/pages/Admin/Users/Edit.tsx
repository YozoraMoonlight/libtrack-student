import { PasswordChecklist } from '@/components/password-checklist';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminLayout from '@/layouts/admin-layout';
import { PHONE_MAX_LENGTH, PHONE_PATTERN, PHONE_PLACEHOLDER, formatPhoneInput } from '@/lib/phone';
import { User } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

const lettersOnly = (value: string) => value.replace(/[^A-Za-z\s'.\-]/g, '');

/** What each stored role is called on screen. */
const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin',
    librarian: 'Librarian',
    user: 'Student',
};

/** A date column arrives as an ISO timestamp; the date input wants YYYY-MM-DD. */
const toDateInput = (value?: string | null) => (value ? String(value).slice(0, 10) : '');

/**
 * Fallback splitter for older users that only have a single `name` column.
 * Keeps the form usable on records created before the first/middle/last columns existed.
 */
function splitFullName(full: string): { first: string; middle: string; last: string } {
    const parts = full.trim().split(/\s+/);
    if (parts.length === 0) return { first: '', middle: '', last: '' };
    if (parts.length === 1) return { first: parts[0], middle: '', last: '' };
    if (parts.length === 2) return { first: parts[0], middle: '', last: parts[1] };
    return { first: parts[0], middle: parts.slice(1, -1).join(' '), last: parts[parts.length - 1] };
}

interface SchoolOption {
    id: number;
    name: string;
    code: string;
}

interface EditUserProps {
    user: User;
    schools: SchoolOption[];
    allowedRoles?: string[];
    lockedSchoolId?: number | null;
}

export default function EditUser({ user, schools, allowedRoles, lockedSchoolId }: EditUserProps) {
    // `user` is the record being edited — the layout must use the logged-in user.
    const { auth } = usePage().props as { auth?: { user?: User } };
    const currentUser = auth?.user;
    // A single allowed role means the field is locked — but locked to the role
    // this account actually has, not to a hard-coded "Librarian".
    const roleLocked = !!allowedRoles && allowedRoles.length === 1;
    const [showPassword, setShowPassword] = useState(false);

    const fallback = splitFullName(user.name ?? '');
    const initialFirst = (user as any).first_name || fallback.first;
    const initialMiddle = (user as any).middle_name || fallback.middle;
    const initialLast = (user as any).last_name || fallback.last;

    const { data, setData, put, processing, errors } = useForm<{
        first_name: string;
        middle_name: string;
        last_name: string;
        birthdate: string;
        email: string;
        password: string;
        user_role: string;
        lrn: string;
        student_id: string;
        phone: string;
        department: string;
        school_id: string;
    }>({
        first_name: initialFirst,
        middle_name: initialMiddle,
        last_name: initialLast,
        birthdate: toDateInput((user as any).birthdate),
        email: user.email,
        password: '',
        user_role: user.user_role,
        lrn: user.lrn ?? '',
        student_id: user.student_id ?? '',
        phone: user.phone ?? '',
        department: user.department ?? '',
        school_id: user.school_id ? String(user.school_id) : '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.users.update', user.id));
    };

    const birthYear = data.birthdate.slice(0, 4);
    const showStudentId = data.user_role === 'user';
    const showDepartment = data.user_role === 'user';
    const requiresSchool = data.user_role === 'librarian' || data.user_role === 'user';

    return (
        <AdminLayout user={currentUser}>
            <Head title={`Edit: ${user.name}`} />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="mx-auto max-w-3xl flex flex-col gap-6">
                    {/* Page header */}
                    <div className="flex items-center gap-4">
                        <Link href={route('admin.users.show', user.id)}>
                            <Button variant="outline" size="sm">Back</Button>
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit User</h1>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>User Details</CardTitle>
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

                                {/* Birthdate — a student's default password is surname + birth
                                    year, so staff have to be able to read (and correct) it here. */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="birthdate">Birthdate</Label>
                                        <Input
                                            id="birthdate"
                                            type="date"
                                            max={new Date().toISOString().split('T')[0]}
                                            min="1900-01-01"
                                            value={data.birthdate}
                                            onChange={(e) => setData('birthdate', e.target.value)}
                                            aria-invalid={!!errors.birthdate}
                                        />
                                        {data.user_role === 'user' && (
                                            <p className="text-xs text-stone-500">
                                                {birthYear.length === 4
                                                    ? `Birth year ${birthYear} — the default student password is surname + birth year.`
                                                    : 'No birthdate on file. The default student password is surname + birth year.'}
                                            </p>
                                        )}
                                        {errors.birthdate && <p className="text-xs text-red-500">{errors.birthdate}</p>}
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
                                        <Label htmlFor="password">Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value.replace(/\s/g, ''))}
                                                placeholder="Leave blank to keep current password"
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
                                </div>

                                {/* Row 3: Role */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="user_role">Role <span className="text-red-500">*</span></Label>
                                        {roleLocked ? (
                                            <Input
                                                id="user_role"
                                                value={ROLE_LABELS[data.user_role] ?? data.user_role}
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

                                {/* LRN + Student ID — only when role is student. The LRN is
                                    what ties the account to its row on the Students page, and
                                    the student can sign in with it. */}
                                {showStudentId && (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="flex flex-col gap-1.5">
                                            <Label htmlFor="lrn">LRN</Label>
                                            <Input
                                                id="lrn"
                                                inputMode="numeric"
                                                maxLength={12}
                                                value={data.lrn}
                                                onChange={(e) => setData('lrn', e.target.value.replace(/\D/g, '').slice(0, 12))}
                                                placeholder="12-digit LRN"
                                                className="font-mono"
                                                aria-invalid={!!errors.lrn}
                                            />
                                            <p className="text-xs text-stone-500">
                                                {data.lrn
                                                    ? 'The student can sign in with this LRN or their email.'
                                                    : 'No LRN on file — the student signs in with their email.'}
                                            </p>
                                            {errors.lrn && <p className="text-xs text-red-500">{errors.lrn}</p>}
                                        </div>
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
                                    </div>
                                )}

                                {/* Row 3: Phone (+ Department for students only) */}
                                <div className={`grid grid-cols-1 gap-4 ${showDepartment ? 'md:grid-cols-2' : ''}`}>
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="phone">Phone</Label>
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
                                        />
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
                                    <Link href={route('admin.users.show', user.id)}>
                                        <Button type="button" variant="outline">Cancel</Button>
                                    </Link>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </AdminLayout>
    );
}
