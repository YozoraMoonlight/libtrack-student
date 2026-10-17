import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminLayout from '@/layouts/admin-layout';
import { PaginatedResponse, User } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface UsersIndexProps {
    user: User;
    users: PaginatedResponse<User>;
    filters: {
        search?: string;
        role?: string;
    };
    allowedRoles?: string[];
}

const ALL_ROLE_TABS = [
    { label: 'All', value: '' },
    { label: 'Admin', value: 'admin' },
    { label: 'Librarian', value: 'librarian' },
    { label: 'Student', value: 'user' },
];

export default function UsersIndex({ user, users, filters, allowedRoles }: UsersIndexProps) {
    const { auth, flash } = usePage().props as any;
    const isSchoolAdmin = (auth?.user?.user_role ?? user?.user_role) === 'school_admin';
    const ROLE_TABS = ALL_ROLE_TABS.filter(
        (tab) => tab.value === '' || !allowedRoles || allowedRoles.includes(tab.value),
    );
    const pageTitle = isSchoolAdmin ? 'Librarians & Students' : 'Users';
    const addLabel = isSchoolAdmin ? 'Register Librarian' : 'Add User';
    const [search, setSearch] = useState(filters.search ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const applyFilters = (newFilters: Record<string, string>) => {
        router.get(
            route('admin.users.index'),
            { search, role: filters.role ?? '', ...newFilters },
            { preserveState: true, replace: true },
        );
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            applyFilters({ search: value });
        }, 300);
    };

    const handleRoleFilter = (role: string) => {
        applyFilters({ role });
    };

    const handleToggleActive = (targetUser: User) => {
        router.post(route('admin.users.toggle-active', targetUser.id), {}, { preserveScroll: true });
    };

    const handleDelete = (targetUser: User) => {
        if (!window.confirm(`Are you sure you want to delete "${targetUser.name}"? This action cannot be undone.`)) return;
        router.delete(route('admin.users.destroy', targetUser.id));
    };

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const activeRole = filters.role ?? '';

    return (
        <AdminLayout user={user}>
            <Head title={pageTitle} />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="flex flex-col gap-6">
                    {/* Page header */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pageTitle}</h1>
                        <Link href={route('admin.users.create')}>
                            <Button className="flex items-center gap-2">
                                <Plus size={16} />
                                {addLabel}
                            </Button>
                        </Link>
                    </div>

                    {/* Every save, delete and enable/disable here redirects back to this
                        page with a message — without this nothing confirmed the change. */}
                    {flash?.success && (
                        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                            {flash.error}
                        </div>
                    )}

                    {/* Search + Role filter */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Input
                            placeholder="Search by name, email, or student ID..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="sm:max-w-xs"
                        />

                        <div className="flex gap-1">
                            {ROLE_TABS.map((tab) => (
                                <Button
                                    key={tab.value}
                                    variant={activeRole === tab.value ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleRoleFilter(tab.value)}
                                >
                                    {tab.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-xl border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Student ID</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                                            No users found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    users.data.map((u) => (
                                        <TableRow key={u.id}>
                                            <TableCell className="font-medium">{u.name}</TableCell>
                                            <TableCell className="text-gray-600 dark:text-gray-400">{u.email}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={u.user_role === 'user' ? 'student' : u.user_role} />
                                            </TableCell>
                                            <TableCell className="text-gray-500">{u.student_id ?? '—'}</TableCell>
                                            <TableCell className="text-gray-500">{u.department ?? '—'}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className={
                                                        u.is_active
                                                            ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
                                                            : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
                                                    }
                                                    onClick={() => handleToggleActive(u)}
                                                >
                                                    {u.is_active ? 'Active' : 'Inactive'}
                                                </Button>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link href={route('admin.users.show', u.id)}>
                                                        <Button variant="ghost" size="icon" title="View">
                                                            <Eye size={16} />
                                                        </Button>
                                                    </Link>
                                                    <Link href={route('admin.users.edit', u.id)}>
                                                        <Button variant="ghost" size="icon" title="Edit">
                                                            <Pencil size={16} />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Delete"
                                                        className="text-red-500 hover:text-red-700"
                                                        onClick={() => handleDelete(u)}
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

                    {/* Pagination */}
                    {users.last_page > 1 && (
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>
                                Showing {users.from ?? 0}–{users.to ?? 0} of {users.total} results
                            </span>
                            <div className="flex gap-1">
                                {users.links.map((link, i) => (
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
