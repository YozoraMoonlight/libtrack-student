import { OtpVerification, type OtpPending } from '@/components/otp-verification';
import { PasswordChecklist } from '@/components/password-checklist';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminLayout from '@/layouts/admin-layout';
import { PHONE_MAX_LENGTH, PHONE_PATTERN, PHONE_PLACEHOLDER, formatPhoneInput } from '@/lib/phone';
import { User } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Search } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface SectionOption {
    id: number;
    grade_level: string;
    name: string;
}

interface Props {
    gradeLevels: string[];
    sections: SectionOption[];
    /** Set while a student submitted from this form waits on their SMS code. */
    otpPending?: OtpPending | null;
}

/**
 * Radix requires a non-empty value per item, so "no section" needs a sentinel.
 * It is translated back to '' before the form is submitted.
 */
const NO_SECTION = '__none__';

interface RegistryHit {
    lrn: string;
    birthdate?: string | null;
    name: string;
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    school_id: number;
    school_name: string;
    school_code: string;
    grade_level?: string | null;
    section?: string | null;
    enrollment_status: string;
}

const lettersOnly = (value: string) => value.replace(/[^A-Za-z\s'.\-]/g, '');
const digitsOnly = (value: string) => value.replace(/\D/g, '');

/**
 * Fold accented Latin characters onto their ASCII base: "Nuñez" -> "Nunez".
 * Must match App\Support\StudentCredentials::toAscii() — if this strips a
 * letter the server transliterates, the password shown to the admin is not the
 * password that was saved, and the student is locked out.
 */
const toAscii = (value: string): string =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * The default student password: SURNAME + BIRTH YEAR, e.g. "Montenegro2005".
 * ASCII letters only and capitalised so it is typeable on a phone keyboard —
 * mirrors App\Support\StudentCredentials::derivePassword() exactly.
 */
const derivePassword = (lastName: string, birthdate: string): string => {
    const letters = toAscii(lastName).replace(/[^A-Za-z]/g, '');
    const year = birthdate.slice(0, 4);
    if (!letters || !/^\d{4}$/.test(year)) return '';
    return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase() + year;
};

export default function ManualRegister({ gradeLevels = [], sections = [], otpPending }: Props) {
    const { auth } = usePage().props as any;
    const currentUser: User = auth?.user;
    const prefix = currentUser?.user_role === 'librarian' ? 'librarian' : 'admin';
    // Librarians have no Sections page — the route does not exist under their
    // prefix, so linking to it would blow up in route() before it ever renders.
    const isLibrarian = currentUser?.user_role === 'librarian';

    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupHit, setLookupHit] = useState<RegistryHit | null>(null);
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Whether the admin has typed their own password. State rather than a ref:
    // the "Reset to …" hint below reads it, and a ref mutation would not
    // re-render to show it.
    const [passwordTouched, setPasswordTouched] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        birthdate: '',
        lrn: '',
        email: '',
        phone: '',
        grade_level: '',
        section: '',
        password: '',
    });

    // The Select is keyed by section id, not by name: two grades may both have a
    // section called "Mabini", and Radix needs the option values to be distinct.
    const [sectionId, setSectionId] = useState<string>(NO_SECTION);

    const suggestedPassword = derivePassword(data.last_name, data.birthdate);

    // Once a grade is chosen only its own sections make sense; before that, show
    // them all so the admin can pick the section and let it set the grade.
    const visibleSections = data.grade_level
        ? sections.filter((s) => s.grade_level === data.grade_level)
        : sections;

    /** Picking a section also settles the grade level — a section only exists inside one. */
    const chooseSection = (value: string) => {
        setSectionId(value);
        if (value === NO_SECTION) {
            setData('section', '');
            return;
        }
        const picked = sections.find((s) => String(s.id) === value);
        if (!picked) return;
        setData((d) => ({ ...d, section: picked.name, grade_level: picked.grade_level }));
    };

    /** Changing the grade drops a section that belongs to the grade being left. */
    const chooseGrade = (value: string) => {
        const picked = sections.find((s) => String(s.id) === sectionId);
        const keep = picked && picked.grade_level === value;
        setSectionId(keep ? sectionId : NO_SECTION);
        setData((d) => ({ ...d, grade_level: value, section: keep ? d.section : '' }));
    };

    /**
     * Keep the password in step with surname + birth year, until the admin
     * overrides it by hand. Done on edit rather than in an effect so there is
     * exactly one place the password can change and no render-order surprises.
     */
    const setNameField = (field: 'last_name' | 'birthdate', value: string) => {
        setData((d) => {
            const next = { ...d, [field]: value };
            return passwordTouched
                ? next
                : { ...next, password: derivePassword(next.last_name, next.birthdate) };
        });
    };

    /**
     * Optional helper — when the school admin enters an LRN that already exists
     * in the DepEd registry, pre-fill the name fields from there.
     */
    const lookupFromRegistry = async () => {
        const lrn = data.lrn.trim();
        if (lrn.length !== 12) {
            setLookupError('Enter the full 12-digit LRN first.');
            return;
        }
        setLookupError(null);
        setLookupLoading(true);
        try {
            const csrfMeta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
            const res = await fetch(route(`${prefix}.lrn.lookup`) + '?lrn=' + encodeURIComponent(lrn), {
                headers: { 'Accept': 'application/json', 'X-CSRF-TOKEN': csrfMeta?.content ?? '' },
            });
            if (!res.ok) {
                setLookupHit(null);
                setLookupError('LRN not found in the DepEd registry. You can still register the student manually below.');
                return;
            }
            const json = (await res.json()) as RegistryHit & { ok: boolean; reason?: string };
            if (!json.ok) {
                setLookupHit(null);
                setLookupError(json.reason ?? 'LRN not found.');
                return;
            }
            // Prefer the registry's stored name parts; fall back to splitting the
            // single name field for legacy rows that predate the split columns.
            let first = json.first_name ?? '';
            let middle = json.middle_name ?? '';
            let last = json.last_name ?? '';
            if (!first && !last) {
                const parts = json.name.trim().split(/\s+/);
                first = parts[0] ?? '';
                last = parts.length > 1 ? parts[parts.length - 1] : '';
                middle = parts.length > 2 ? parts.slice(1, -1).join(' ') : '';
            }

            // Only adopt the registry grade when it's one of the offered options.
            const prefillGrade = json.grade_level && gradeLevels.includes(json.grade_level) ? json.grade_level : '';

            // Same for the section: a legacy registry row can hold free text that
            // no longer matches any section, and pre-filling it would put a value
            // in the form that the server is about to reject.
            //
            // It must be matched against the grade the form will actually END UP
            // with — otherwise a Grade 7 section can be selected while the field
            // still says Grade 8, and the Select renders blank because the chosen
            // id isn't among the options for the displayed grade.
            const effectiveGrade = prefillGrade || data.grade_level;
            const prefillSection = json.section
                ? sections.find(
                      (s) =>
                          s.name.toLowerCase() === String(json.section).trim().toLowerCase() &&
                          (!effectiveGrade || s.grade_level === effectiveGrade),
                  )
                : undefined;
            setSectionId(prefillSection ? String(prefillSection.id) : NO_SECTION);

            setData((d) => ({
                ...d,
                first_name: lettersOnly(first),
                middle_name: lettersOnly(middle),
                last_name: lettersOnly(last),
                birthdate: json.birthdate ? String(json.birthdate).slice(0, 10) : d.birthdate,
                // A section resolved with no grade in play brings its own grade,
                // keeping the pair consistent.
                grade_level: prefillGrade || prefillSection?.grade_level || d.grade_level,
                section: prefillSection?.name ?? '',
                password: derivePassword(
                    lettersOnly(last),
                    json.birthdate ? String(json.birthdate).slice(0, 10) : d.birthdate,
                ),
            }));
            // The lookup just replaced the surname and birthdate, so the
            // previously-typed password no longer belongs to this student.
            setPasswordTouched(false);
            setLookupHit(json);
            setLookupError(null);
        } catch {
            setLookupError('Lookup failed. You can still register the student manually below.');
        } finally {
            setLookupLoading(false);
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(route(`${prefix}.students.manual-register.store`), {
            onSuccess: () => {
                reset();
                setLookupHit(null);
                setPasswordTouched(false);
                setSectionId(NO_SECTION);
            },
        });
    };

    return (
        <AdminLayout user={currentUser}>
            <Head title="Manual Register Student" />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6">
                <div className="mx-auto max-w-2xl space-y-6">
                    <Link href={route(`${prefix}.students.index`)} className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800">
                        <ArrowLeft size={14} />Back to Students
                    </Link>

                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Register Student</h1>
                        <p className="text-sm text-gray-500">
                            Register a new student directly. The DepEd LRN is optional — you can register
                            students who haven&apos;t been issued one yet.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Names */}
                        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
                            <h2 className="text-sm font-semibold text-stone-700">Student name</h2>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="first_name">First Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="first_name"
                                        value={data.first_name}
                                        onChange={(e) => setData('first_name', lettersOnly(e.target.value))}
                                        className="h-11 rounded-xl"
                                        required
                                    />
                                    {errors.first_name && <p className="text-xs text-red-500">{errors.first_name}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="middle_name">Middle Name</Label>
                                    <Input
                                        id="middle_name"
                                        value={data.middle_name}
                                        onChange={(e) => setData('middle_name', lettersOnly(e.target.value))}
                                        className="h-11 rounded-xl"
                                    />
                                    {errors.middle_name && <p className="text-xs text-red-500">{errors.middle_name}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="last_name">Last Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="last_name"
                                        value={data.last_name}
                                        onChange={(e) => setNameField('last_name', lettersOnly(e.target.value))}
                                        className="h-11 rounded-xl"
                                        required
                                    />
                                    {errors.last_name && <p className="text-xs text-red-500">{errors.last_name}</p>}
                                </div>
                            </div>

                            {/* Birthdate drives the default password below. */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="birthdate">Birthdate <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="birthdate"
                                        type="date"
                                        max={new Date().toISOString().split('T')[0]}
                                        min="1900-01-01"
                                        value={data.birthdate}
                                        onChange={(e) => setNameField('birthdate', e.target.value)}
                                        className="h-11 rounded-xl"
                                        required
                                    />
                                    <p className="text-xs text-stone-500">
                                        Used to build the student&apos;s password: surname + birth year.
                                    </p>
                                    {errors.birthdate && <p className="text-xs text-red-500">{errors.birthdate}</p>}
                                </div>
                            </div>
                        </div>

                        {/* LRN — typed in here directly. The Lookup button beside it is
                            only a shortcut that pre-fills the name from the DepEd registry;
                            whatever is in the box is what gets saved either way. */}
                        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold text-stone-700">Learner Reference Number</h2>
                                <span className="text-xs text-stone-500">Leave blank if the student doesn&apos;t have one yet</span>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="lrn">
                                    LRN <span className="font-normal text-stone-400">(12 digits, optional)</span>
                                </Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="lrn"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={12}
                                        value={data.lrn}
                                        onChange={(e) => setData('lrn', digitsOnly(e.target.value))}
                                        placeholder="123456789012"
                                        className="h-11 flex-1 rounded-xl font-mono"
                                    />
                                    <Button
                                        type="button"
                                        onClick={lookupFromRegistry}
                                        disabled={lookupLoading || data.lrn.length !== 12}
                                        title={
                                            data.lrn.length === 12
                                                ? 'Fill the name and class from the DepEd registry'
                                                : 'Enter all 12 digits to use the registry lookup'
                                        }
                                        className="h-11 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 gap-2"
                                    >
                                        {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                        <span className="hidden sm:inline">Lookup</span>
                                    </Button>
                                </div>
                                <p className="text-xs text-stone-500">
                                    Type the LRN here and it is saved with the student — the student can then sign
                                    in with it. <span className="font-medium">Lookup</span> is optional: it only fills
                                    in the name and class from the DepEd registry, and a &quot;not found&quot; result
                                    does not stop you from saving the LRN.
                                    {data.lrn.length > 0 && data.lrn.length < 12 && (
                                        <span className="ml-1 font-medium text-amber-700">
                                            {data.lrn.length} of 12 digits entered.
                                        </span>
                                    )}
                                </p>
                            </div>
                            {errors.lrn && <p className="text-sm text-red-600">{errors.lrn}</p>}
                            {lookupError && (
                                <p className="text-sm text-amber-700 flex items-center gap-1">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    {lookupError}
                                </p>
                            )}
                            {lookupHit && (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                    <div className="flex items-center gap-2 font-semibold text-emerald-800">
                                        <CheckCircle2 className="h-4 w-4" />Pre-filled from DepEd registry
                                    </div>
                                    <div className="mt-1 text-xs text-stone-700">
                                        <div><span className="text-stone-500">School:</span> {lookupHit.school_name} ({lookupHit.school_code})</div>
                                        {lookupHit.grade_level && (
                                            <div><span className="text-stone-500">Grade/Section:</span> {lookupHit.grade_level} {lookupHit.section ? `– ${lookupHit.section}` : ''}</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Contact + classroom info */}
                        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
                            <h2 className="text-sm font-semibold text-stone-700">Contact & classroom</h2>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className="h-11 rounded-xl"
                                        required
                                    />
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
                                        onChange={(e) => setData('phone', formatPhoneInput(e.target.value))}
                                        placeholder={PHONE_PLACEHOLDER}
                                        className="h-11 rounded-xl"
                                        required
                                    />
                                    {errors.phone && <p className="text-sm text-red-600">{errors.phone}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="grade_level">Grade Level</Label>
                                    <Select value={data.grade_level} onValueChange={chooseGrade}>
                                        <SelectTrigger id="grade_level" className="h-11 rounded-xl">
                                            <SelectValue placeholder="Select grade level" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {gradeLevels.map((g) => (
                                                <SelectItem key={g} value={g}>{g}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.grade_level && <p className="text-sm text-red-600">{errors.grade_level}</p>}
                                </div>
                                {/* Section is a dropdown of the sections this school set up —
                                    no more free text, so no more "G7-A" vs "g7 a" duplicates. */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="section">Section</Label>
                                    <Select value={sectionId} onValueChange={chooseSection} disabled={sections.length === 0}>
                                        <SelectTrigger id="section" className="h-11 rounded-xl">
                                            <SelectValue
                                                placeholder={
                                                    sections.length === 0 ? 'No sections set up yet' : 'Select section'
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={NO_SECTION}>No section</SelectItem>
                                            {visibleSections.map((s) => (
                                                <SelectItem key={s.id} value={String(s.id)}>
                                                    {data.grade_level ? s.name : `${s.grade_level} – ${s.name}`}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {sections.length === 0 ? (
                                        isLibrarian ? (
                                            <p className="text-xs text-stone-500">
                                                No sections have been set up for your school yet — ask your school
                                                admin to add them.
                                            </p>
                                        ) : (
                                            <p className="text-xs text-stone-500">
                                                Add your school&apos;s sections on the{' '}
                                                <Link href={route(`${prefix}.sections.index`)} className="font-semibold underline">
                                                    Sections
                                                </Link>{' '}
                                                page and they will appear here.
                                            </p>
                                        )
                                    ) : (
                                        data.grade_level &&
                                        visibleSections.length === 0 &&
                                        (isLibrarian ? (
                                            <p className="text-xs text-amber-700">
                                                {data.grade_level} has no sections yet — ask your school admin to add one.
                                            </p>
                                        ) : (
                                            <p className="text-xs text-amber-700">
                                                {data.grade_level} has no sections yet — add one on the{' '}
                                                <Link
                                                    href={route(`${prefix}.sections.index`)}
                                                    className="font-semibold underline"
                                                >
                                                    Sections
                                                </Link>{' '}
                                                page.
                                            </p>
                                        ))
                                    )}
                                    {errors.section && <p className="text-sm text-red-600">{errors.section}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Password */}
                        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
                            <h2 className="text-sm font-semibold text-stone-700">Account password</h2>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            // Shown in the clear by default: this is a
                                            // handed-out default the admin needs to read
                                            // back to the student.
                                            type={showPassword ? 'text' : 'password'}
                                            value={data.password}
                                            onChange={(e) => {
                                                setPasswordTouched(true);
                                                setData('password', e.target.value.replace(/\s/g, ''));
                                            }}
                                            className="h-11 rounded-xl pr-11 font-mono"
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

                                    {suggestedPassword && !passwordTouched && (
                                        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                                            Auto-filled from surname + birth year:{' '}
                                            <span className="font-mono font-semibold">{suggestedPassword}</span>. You can
                                            change it — give the student whatever ends up in this box.
                                        </p>
                                    )}
                                    {passwordTouched && suggestedPassword && data.password !== suggestedPassword && (
                                        <button
                                            type="button"
                                            className="text-xs text-amber-700 underline"
                                            onClick={() => {
                                                setPasswordTouched(false);
                                                setData('password', suggestedPassword);
                                            }}
                                        >
                                            Reset to {suggestedPassword}
                                        </button>
                                    )}

                                    <PasswordChecklist value={data.password} variant="student" />
                                    {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={processing}
                            className="h-11 w-full rounded-xl bg-stone-900 hover:bg-stone-800"
                        >
                            {processing ? 'Creating...' : 'Register Student'}
                        </Button>
                    </form>
                </div>

                {/* The student account is written only once this code is confirmed. */}
                {otpPending && (
                    <OtpVerification
                        pending={otpPending}
                        verifyRoute={`${prefix}.students.manual-register.verify`}
                        resendRoute={`${prefix}.students.manual-register.resend`}
                        cancelRoute={`${prefix}.students.manual-register.cancel`}
                        noun="student"
                    />
                )}
            </main>
        </AdminLayout>
    );
}
