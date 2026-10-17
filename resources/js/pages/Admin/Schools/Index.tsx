import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminLayout from '@/layouts/admin-layout';
import { PaginatedResponse, User } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Ban, Building2, CheckCircle2, Eye, Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react';
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
    created_at: string;
    updated_at: string;
}

interface SchoolsIndexProps {
    schools: PaginatedResponse<School>;
    filters: {
        search?: string;
        status?: string;
    };
}

const STATUS_TABS = [
    { label: 'All', value: '' },
    { label: 'Active', value: 'active' },
    { label: 'Disabled', value: 'disabled' },
];

export default function SchoolsIndex({ schools, filters }: SchoolsIndexProps) {
    const { auth, flash } = usePage().props as any;
    const currentUser: User = auth?.user;

    const [search, setSearch] = useState(filters.search ?? '');
    const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'error' | null; text: string | null }>({
        type: null,
        text: null,
    });
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (flash?.success) setFlashMessage({ type: 'success', text: flash.success });
        else if (flash?.error) setFlashMessage({ type: 'error', text: flash.error });
        else setFlashMessage({ type: null, text: null });
    }, [flash]);

    const applyFilters = (next: Record<string, string>) => {
        router.get(
            route('admin.schools.index'),
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

    const handleToggleActive = (school: School) => {
        const action = school.is_active ? 'disable' : 'enable';
        if (!window.confirm(`Are you sure you want to ${action} "${school.name}"?`)) return;
        router.post(route('admin.schools.toggle-active', school.id), {}, { preserveScroll: true });
    };

    const handleDelete = (school: School) => {
        if (!window.confirm(
            `Delete "${school.name}"? This will remove the school (including its address) and unassign its librarians, students, and books. This cannot be undone.`,
        )) return;
        router.delete(route('admin.schools.destroy', school.id), { preserveScroll: true });
    };

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const activeStatus = filters.status ?? '';

    return (
        <AdminLayout user={currentUser}>
            <Head title="Schools" />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Schools</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Manage schools. Librarians, students, and books are scoped per school.
                            </p>
                        </div>
                        <Link href={route('admin.schools.create')}>
                            <Button className="flex items-center gap-2">
                                <Plus size={16} />
                                Add School
                            </Button>
                        </Link>
                    </div>

                    {flashMessage.text && (
                        <div
                            className={
                                flashMessage.type === 'success'
                                    ? 'rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
                                    : 'rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }
                        >
                            {flashMessage.text}
                        </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Input
                            placeholder="Search by name, code, or address..."
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

                    <div className="rounded-xl border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead className="text-center">Librarians</TableHead>
                                    <TableHead className="text-center">Students</TableHead>
                                    <TableHead className="text-center">Books</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {schools.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-10 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Building2 size={32} className="text-gray-300" />
                                                <span>No schools found. Add one to get started.</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    schools.data.map((school) => (
                                        <TableRow key={school.id} className={!school.is_active ? 'bg-red-50/30 dark:bg-red-900/5' : ''}>
                                            <TableCell className="font-medium">
                                                <Link
                                                    href={route('admin.schools.show', school.id)}
                                                    className="text-amber-700 hover:text-amber-900 hover:underline"
                                                >
                                                    {school.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-gray-500">{school.code}</TableCell>
                                            <TableCell className="text-gray-500">{school.address ?? '—'}</TableCell>
                                            <TableCell className="text-center text-gray-600 dark:text-gray-400">
                                                {school.librarians_count ?? 0}
                                            </TableCell>
                                            <TableCell className="text-center text-gray-600 dark:text-gray-400">
                                                {school.students_count ?? 0}
                                            </TableCell>
                                            <TableCell className="text-center text-gray-600 dark:text-gray-400">
                                                {school.books_count ?? 0}
                                            </TableCell>
                                            <TableCell>
                                                {school.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                                        <CheckCircle2 size={12} />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
                                                        <ShieldAlert size={12} />
                                                        Disabled
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link href={route('admin.schools.show', school.id)}>
                                                        <Button variant="ghost" size="icon" title="View students">
                                                            <Eye size={16} />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title={school.is_active ? 'Disable' : 'Enable'}
                                                        onClick={() => handleToggleActive(school)}
                                                    >
                                                        {school.is_active ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                                                    </Button>
                                                    <Link href={route('admin.schools.edit', school.id)}>
                                                        <Button variant="ghost" size="icon" title="Edit">
                                                            <Pencil size={16} />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Delete"
                                                        className="text-red-500 hover:text-red-700"
                                                        onClick={() => handleDelete(school)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {schools.last_page > 1 && (
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>
                                Showing {schools.from ?? 0}–{schools.to ?? 0} of {schools.total} schools
                            </span>
                            <div className="flex gap-1">
                                {schools.links.map((link, i) => (
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
