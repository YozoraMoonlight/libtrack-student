import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminLayout from '@/layouts/admin-layout';
import { PaginatedResponse, User } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, BookOpen, Building2, CheckCircle2, Clock, ShieldAlert, Users as UsersIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface School {
    id: number;
    name: string;
    code: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    is_active: boolean;
    librarians_count?: number;
    students_count?: number;
    books_count?: number;
}

interface StudentRow {
    id: number;
    lrn: string;
    name: string;
    grade_level: string | null;
    section: string | null;
    enrollment_status: string | null;
    is_registered: boolean;
    user: {
        id: number;
        email: string;
        phone: string | null;
        is_active: boolean;
    } | null;
}

interface Props {
    school: School;
    students: PaginatedResponse<StudentRow>;
    filters: { search?: string };
}

export default function SchoolShow({ school, students, filters }: Props) {
    const { auth } = usePage().props as any;
    const currentUser: User = auth?.user;

    const [search, setSearch] = useState(filters.search ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

    const handleSearchChange = (value: string) => {
        setSearch(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            router.get(
                route('admin.schools.show', school.id),
                { search: value },
                { preserveState: true, replace: true },
            );
        }, 300);
    };

    return (
        <AdminLayout user={currentUser}>
            <Head title={`${school.name} — School Monitoring`} />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="flex flex-col gap-6">
                    <Link
                        href={route('admin.schools.index')}
                        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800"
                    >
                        <ArrowLeft size={14} />Back to Schools
                    </Link>

                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                                <Building2 size={18} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{school.name}</h1>
                                <p className="text-xs text-gray-500">
                                    <span className="font-mono">{school.code}</span>
                                    {school.address ? <> &middot; {school.address}</> : null}
                                </p>
                            </div>
                            <span
                                className={
                                    'ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ' +
                                    (school.is_active
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-red-50 text-red-700')
                                }
                            >
                                {school.is_active ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
                                {school.is_active ? 'Active' : 'Disabled'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-xs font-medium uppercase text-stone-500">
                                <UsersIcon size={14} />Students
                            </div>
                            <div className="mt-2 text-2xl font-bold text-stone-900">{school.students_count ?? 0}</div>
                        </div>
                        <div className="rounded-xl border bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-xs font-medium uppercase text-stone-500">
                                <BookOpen size={14} />Books
                            </div>
                            <div className="mt-2 text-2xl font-bold text-stone-900">{school.books_count ?? 0}</div>
                        </div>
                        <div className="rounded-xl border bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-xs font-medium uppercase text-stone-500">
                                <UsersIcon size={14} />Librarians
                            </div>
                            <div className="mt-2 text-2xl font-bold text-stone-900">{school.librarians_count ?? 0}</div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Enrolled Students</h2>
                            <p className="text-xs text-gray-500">View-only list of students registered to this school.</p>
                        </div>
                        <Input
                            placeholder="Search by name or LRN..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="max-w-xs"
                        />
                    </div>

                    <div className="rounded-xl border bg-white shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>LRN</TableHead>
                                    <TableHead>Grade / Section</TableHead>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Enrollment</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-10 text-center text-gray-500">
                                            No students found for this school.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    students.data.map((row) => (
                                        <TableRow key={row.id}>
                                            <TableCell className="font-medium">{row.name}</TableCell>
                                            <TableCell className="font-mono text-xs text-gray-600">{row.lrn}</TableCell>
                                            <TableCell className="text-sm text-gray-600">
                                                {row.grade_level ?? '—'}
                                                {row.section ? ` · ${row.section}` : ''}
                                            </TableCell>
                                            <TableCell>
                                                {row.is_registered ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                        <CheckCircle2 size={12} />Registered
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-600">
                                                        <Clock size={12} />Not registered
                                                    </span>
                                                )}
                                                {row.user?.email && (
                                                    <div className="mt-1 text-xs text-gray-500">{row.user.email}</div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={
                                                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ' +
                                                        (row.enrollment_status === 'enrolled'
                                                            ? 'bg-blue-50 text-blue-700'
                                                            : row.enrollment_status === 'graduated'
                                                              ? 'bg-purple-50 text-purple-700'
                                                              : row.enrollment_status === 'transferred'
                                                                ? 'bg-yellow-50 text-yellow-700'
                                                                : 'bg-stone-100 text-stone-600')
                                                    }
                                                >
                                                    {row.enrollment_status ?? 'enrolled'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {!row.is_registered ? (
                                                    <span className="text-xs text-gray-400">—</span>
                                                ) : row.user?.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                                                        <CheckCircle2 size={12} />Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                                                        <ShieldAlert size={12} />Disabled
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
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
