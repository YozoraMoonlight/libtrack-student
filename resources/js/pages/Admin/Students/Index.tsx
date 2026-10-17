import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AdminLayout from '@/layouts/admin-layout';
import { PaginatedResponse, User } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRightLeft, Ban, CheckCircle2, Clock, Lock, ShieldAlert, Trash2, Upload, UserPlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface StudentRow {
    id: number;
    lrn: string;
    name: string;
    grade_level: string | null;
    section: string | null;
    enrollment_status: string | null;
    school?: { id: number; name: string; code: string } | null;
    is_registered: boolean;
    user: {
        id: number;
        email: string;
        phone: string | null;
        is_active: boolean;
        credential_holds?: { id: number; status: string }[];
    } | null;
}

interface SectionOption {
    id: number;
    grade_level: string;
    name: string;
}

interface StudentsIndexProps {
    students: PaginatedResponse<StudentRow>;
    filters: {
        search?: string;
        status?: string;
    };
    gradeLevels?: string[];
    sections?: SectionOption[];
}

/** Radix needs a non-empty option value; this one means "no section". */
const NO_SECTION = '__none__';

const STATUS_TABS = [
    { label: 'All', value: '' },
    { label: 'Registered', value: 'registered' },
    { label: 'Not registered', value: 'unregistered' },
];

const ENROLLMENT_OPTIONS = [
    { value: 'enrolled', label: 'Enrolled' },
    { value: 'not_enrolled', label: 'Not enrolled' },
    { value: 'transferred', label: 'Transferred' },
    { value: 'graduated', label: 'Graduated' },
];

export default function StudentsIndex({ students, filters, gradeLevels = [], sections = [] }: StudentsIndexProps) {
    // A student signing up flips their row to Registered without a manual refresh.
    useLiveRefresh();
    const { auth, flash } = usePage().props as any;
    const currentUser: User = auth?.user;
    const prefix = currentUser?.user_role === 'librarian' ? 'librarian' : 'admin';

    const [search, setSearch] = useState(filters.search ?? '');
    const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'error' | null; text: string | null }>({
        type: null,
        text: null,
    });
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Which student's grade/section is being changed, and to what. One row at a
    // time — this is a promotion ("Grade 7 → Grade 8"), not a bulk edit.
    const [movingId, setMovingId] = useState<number | null>(null);
    const [moveGrade, setMoveGrade] = useState('');
    const [moveSection, setMoveSection] = useState<string>(NO_SECTION);
    const [moveError, setMoveError] = useState<string | null>(null);

    useEffect(() => {
        if (flash?.success) setFlashMessage({ type: 'success', text: flash.success });
        else if (flash?.error) setFlashMessage({ type: 'error', text: flash.error });
        else setFlashMessage({ type: null, text: null });
    }, [flash]);

    const applyFilters = (next: Record<string, string>) => {
        router.get(
            route(`${prefix}.students.index`),
            { search, status: filters.status ?? '', ...next },
            { preserveState: true, replace: true },
        );
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => applyFilters({ search: value }), 300);
    };

    const handleStatusFilter = (status: string) => applyFilters({ status });

    const handleToggleActive = (row: StudentRow) => {
        if (!row.user) return;
        const action = row.user.is_active ? 'disable' : 'enable';
        if (!window.confirm(`Are you sure you want to ${action} "${row.name}"?`)) return;
        router.post(
            route(`${prefix}.students.toggle-active`, row.user.id),
            {},
            { preserveScroll: true },
        );
    };

    const handleDelete = (row: StudentRow) => {
        if (!row.user) return;
        if (row.enrollment_status === 'enrolled') {
            window.alert(`Cannot delete "${row.name}" — student is still enrolled.`);
            return;
        }
        if (!window.confirm(`Permanently delete "${row.name}"? This cannot be undone.`)) return;
        router.delete(route(`${prefix}.students.destroy`, row.user.id), { preserveScroll: true });
    };

    const handleEnrollmentChange = (row: StudentRow, value: string) => {
        if (value === (row.enrollment_status ?? 'enrolled')) return;
        router.put(
            route(`${prefix}.students.enrollment`, row.id), // row.id is the LRN-registry id
            { enrollment_status: value },
            { preserveScroll: true, preserveState: false },
        );
    };

    const startMove = (row: StudentRow) => {
        const grade = row.grade_level ?? gradeLevels[0] ?? '';
        // Match the row's section by name inside its own grade — two grades can
        // both have a "Mabini", and the select is keyed by id.
        const current = sections.find(
            (sec) => sec.grade_level === grade && sec.name.toLowerCase() === (row.section ?? '').toLowerCase(),
        );
        setMovingId(row.id);
        setMoveGrade(grade);
        setMoveSection(current ? String(current.id) : NO_SECTION);
        setMoveError(null);
    };

    /** Changing the grade drops a section that belongs to the grade being left. */
    const chooseMoveGrade = (value: string) => {
        const picked = sections.find((sec) => String(sec.id) === moveSection);
        setMoveSection(picked && picked.grade_level === value ? moveSection : NO_SECTION);
        setMoveGrade(value);
    };

    const savePlacement = (row: StudentRow) => {
        router.put(
            route(`${prefix}.students.placement`, row.id), // row.id is the LRN-registry id
            {
                grade_level: moveGrade,
                section_id: moveSection === NO_SECTION ? null : Number(moveSection),
            },
            {
                preserveScroll: true,
                onSuccess: () => setMovingId(null),
                onError: (errs) => setMoveError(errs.section_id ?? errs.grade_level ?? 'Could not move that student.'),
            },
        );
    };

    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

    const activeStatus = filters.status ?? '';

    return (
        <AdminLayout user={currentUser}>
            <Head title="Students" />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Students</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Manage student accounts. Disabled or deletion is blocked while a student is still enrolled.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {(currentUser?.user_role === 'admin' || currentUser?.user_role === 'school_admin') && (
                                <Link href={route(`${prefix}.students.import`)}>
                                    <Button variant="outline" className="gap-2"><Upload size={16}/>Batch Upload</Button>
                                </Link>
                            )}
                            <Link href={route(`${prefix}.students.manual-register`)}>
                                <Button className="gap-2 bg-amber-500 hover:bg-amber-600"><UserPlus size={16}/>Manual Register</Button>
                            </Link>
                        </div>
                    </div>

                    {flashMessage.text && (
                        <div
                            className={
                                flashMessage.type === 'success'
                                    ? 'rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700'
                                    : 'rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'
                            }
                        >
                            {flashMessage.text}
                        </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Input
                            placeholder="Search by name, email, LRN, or student ID..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="sm:max-w-xs"
                        />
                        <div className="flex gap-1">
                            {STATUS_TABS.map((tab) => (
                                <Button
                                    key={tab.value}
                                    variant={activeStatus === tab.value ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleStatusFilter(tab.value)}
                                >
                                    {tab.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-xl border bg-white shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>LRN</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Enrollment</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-10 text-center text-gray-500">
                                            No students found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    students.data.map((row) => {
                                        const hasHold = (row.user?.credential_holds ?? []).some(h => h.status === 'active');
                                        const isEnrolled = row.enrollment_status === 'enrolled';
                                        const userActive = row.user?.is_active ?? false;
                                        return (
                                        <TableRow key={row.id} className={row.is_registered && !userActive ? 'bg-red-50/30' : ''}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {row.name}
                                                    {hasHold && (
                                                        <span title="Credentials are held — student has unpaid fines or overdue books" className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                                                            <Lock size={10}/>Held
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-gray-600">{row.lrn}</TableCell>
                                            {/* Grade + section were already on the row but never shown. With
                                                sections now a managed list, this is where an admin checks
                                                who is in which class before renaming or clearing one. */}
                                            <TableCell className="text-xs text-gray-600">
                                                {movingId === row.id ? (
                                                    <div className="flex flex-col gap-1.5">
                                                        <Select value={moveGrade} onValueChange={chooseMoveGrade}>
                                                            <SelectTrigger className="h-8 w-[150px] text-xs">
                                                                <SelectValue placeholder="Grade level" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {gradeLevels.map((g) => (
                                                                    <SelectItem key={g} value={g}>{g}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Select value={moveSection} onValueChange={setMoveSection}>
                                                            <SelectTrigger className="h-8 w-[150px] text-xs">
                                                                <SelectValue placeholder="Section" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value={NO_SECTION}>No section</SelectItem>
                                                                {sections
                                                                    .filter((sec) => sec.grade_level === moveGrade)
                                                                    .map((sec) => (
                                                                        <SelectItem key={sec.id} value={String(sec.id)}>
                                                                            {sec.name}
                                                                        </SelectItem>
                                                                    ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {moveError && <span className="text-xs text-red-600">{moveError}</span>}
                                                        <div className="flex gap-1">
                                                            <Button
                                                                size="sm"
                                                                className="h-7 px-2 text-xs"
                                                                disabled={!moveGrade}
                                                                onClick={() => savePlacement(row)}
                                                            >
                                                                Move
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 px-2 text-xs"
                                                                onClick={() => setMovingId(null)}
                                                            >
                                                                <X size={12} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-start gap-2">
                                                        <div>
                                                            {row.grade_level ? (
                                                                <>
                                                                    <span className="block">{row.grade_level}</span>
                                                                    <span className="block text-gray-400">{row.section ?? 'No section'}</span>
                                                                </>
                                                            ) : (
                                                                <span className="text-gray-400">—</span>
                                                            )}
                                                        </div>
                                                        {gradeLevels.length > 0 && (
                                                            <button
                                                                type="button"
                                                                title="Move this student to another grade level or section"
                                                                onClick={() => startMove(row)}
                                                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                                            >
                                                                <ArrowRightLeft size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {row.is_registered ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                        <CheckCircle2 size={12}/>Registered
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                                                        <Clock size={12}/>Not registered
                                                    </span>
                                                )}
                                                {row.user?.email && (
                                                    <div className="mt-1 text-xs text-gray-500">{row.user.email}</div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={row.enrollment_status ?? 'enrolled'}
                                                    onValueChange={(v) => handleEnrollmentChange(row, v)}
                                                >
                                                    <SelectTrigger className="h-8 w-[150px] text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {ENROLLMENT_OPTIONS.map((o) => (
                                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                {!row.is_registered ? (
                                                    <span className="text-xs text-gray-400">—</span>
                                                ) : userActive ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                                                        <CheckCircle2 size={12} />Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                                                        <ShieldAlert size={12} />Disabled
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {row.is_registered ? (
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant={userActive ? 'destructive' : 'default'}
                                                            size="sm"
                                                            onClick={() => handleToggleActive(row)}
                                                            className="gap-1"
                                                        >
                                                            {userActive ? <><Ban size={12}/>Disable</> : <><CheckCircle2 size={12}/>Enable</>}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(row)}
                                                            disabled={isEnrolled}
                                                            title={isEnrolled ? 'Cannot delete — student still enrolled' : 'Delete student'}
                                                            className="gap-1 text-red-600 hover:bg-red-50"
                                                        >
                                                            <Trash2 size={12}/>
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">Awaiting student signup</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {students.last_page > 1 && (
                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Showing {students.from ?? 0}–{students.to ?? 0} of {students.total} students</span>
                            <div className="flex gap-1">
                                {students.links.map((link, i) => (
                                    <Button
                                        key={i}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className="min-w-8"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </AdminLayout>
    );
}
