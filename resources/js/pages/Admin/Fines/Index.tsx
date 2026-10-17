import FlashMessages from '@/components/FlashMessages';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AdminLayout from '@/layouts/admin-layout';
import type { Fine, PaginatedResponse } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Plus, Receipt, Search } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';

interface SimpleUser {
    id: number;
    name: string;
    email: string;
}

interface Props {
    fines: PaginatedResponse<Fine>;
    totalUnpaid: number;
    filters: { search?: string; status?: string };
    users?: SimpleUser[];
}

const STATUS_TABS = [
    { label: 'All', value: undefined },
    { label: 'Unpaid', value: 'unpaid' },
    { label: 'Paid', value: 'paid' },
];

export default function FinesIndex({ fines, totalUnpaid, filters, users = [] }: Props) {
    useLiveRefresh();
    const { auth } = usePage().props as any;
    const routePrefix = auth?.user?.user_role === 'librarian' ? 'librarian' : 'admin';
    const [search, setSearch] = useState(filters.search ?? '');
    const [dialogOpen, setDialogOpen] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const form = useForm({
        user_id: '',
        type: 'overdue' as 'overdue' | 'lost' | 'damaged',
        amount: '',
        description: '',
    });

    const applyFilters = (overrides: Record<string, string | undefined>) => {
        router.get(
            route(`${routePrefix}.fines.index`),
            { search: search || undefined, status: filters.status || undefined, ...overrides },
            { preserveState: true, replace: true },
        );
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            applyFilters({ search: value || undefined });
        }, 300);
    };

    const filterByStatus = (status: string | undefined) => {
        applyFilters({ status });
    };

    const handleAction = (fine: Fine, action: 'mark_paid' | 'hold_credentials') => {
        if (action === 'hold_credentials') {
            const ok = window.confirm(
                `Place a credentials hold on ${fine.user?.name ?? 'this student'} for the unpaid fine of P${Number(fine.amount).toFixed(2)}? They will be blocked from clearance until released.`,
            );
            if (!ok) return;
        }
        router.put(route(`${routePrefix}.fines.update`, fine.id), { action }, { preserveState: false });
    };

    const handleCreateFine = (e: FormEvent) => {
        e.preventDefault();
        form.post(route(`${routePrefix}.fines.store`), {
            onSuccess: () => {
                setDialogOpen(false);
                form.reset();
            },
        });
    };

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    return (
        <AdminLayout user={auth.user}>
            <Head title="Fine Management" />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="flex flex-col gap-6">
                    {/* Fine created / marked paid / hold placed — and refusals — land here. */}
                    <FlashMessages />

                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Fine Management</h1>
                        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Fine
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Create Fine</DialogTitle>
                                    <DialogDescription>
                                        Manually assign a fine to a student.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreateFine} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="user_id">Student</Label>
                                        <Select
                                            value={form.data.user_id}
                                            onValueChange={(val) => form.setData('user_id', val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a student" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {users.map((u) => (
                                                    <SelectItem key={u.id} value={String(u.id)}>
                                                        {u.name} ({u.email})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {form.errors.user_id && (
                                            <p className="text-sm text-red-500">{form.errors.user_id}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="type">Type</Label>
                                        <Select
                                            value={form.data.type}
                                            onValueChange={(val) => form.setData('type', val as 'overdue' | 'lost' | 'damaged')}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select fine type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="overdue">Overdue</SelectItem>
                                                <SelectItem value="lost">Lost</SelectItem>
                                                <SelectItem value="damaged">Damaged</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {form.errors.type && (
                                            <p className="text-sm text-red-500">{form.errors.type}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="amount">Amount (PHP)</Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            placeholder="0.00"
                                            value={form.data.amount}
                                            onChange={(e) => form.setData('amount', e.target.value)}
                                        />
                                        {form.errors.amount && (
                                            <p className="text-sm text-red-500">{form.errors.amount}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="description">Description (optional)</Label>
                                        <Input
                                            id="description"
                                            type="text"
                                            placeholder="e.g. Lost book - 'Introduction to Algorithms'"
                                            value={form.data.description}
                                            onChange={(e) => form.setData('description', e.target.value)}
                                        />
                                        {form.errors.description && (
                                            <p className="text-sm text-red-500">{form.errors.description}</p>
                                        )}
                                    </div>

                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setDialogOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={form.processing}>
                                            {form.processing ? 'Creating...' : 'Create Fine'}
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Summary card */}
                    <Card className="w-full sm:w-auto sm:self-start">
                        <CardContent className="flex items-center gap-4 pt-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                <Receipt size={22} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    P{Number(totalUnpaid).toFixed(2)}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Total Unpaid Fines</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Filters */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1 sm:max-w-xs">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Search by student or book..."
                                value={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {STATUS_TABS.map((tab) => (
                                <Button
                                    key={tab.label}
                                    variant={filters.status === tab.value ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => filterByStatus(tab.value)}
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
                                    <TableHead>Student Name</TableHead>
                                    <TableHead>Book</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Paid</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fines.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                                            No fines found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    fines.data.map((fine) => (
                                        <TableRow key={fine.id}>
                                            <TableCell className="font-medium">
                                                {fine.user?.name ?? 'N/A'}
                                            </TableCell>
                                            <TableCell className="max-w-[160px] truncate">
                                                {fine.transaction?.book?.title ?? '—'}
                                            </TableCell>
                                            <TableCell className="capitalize">{fine.type}</TableCell>
                                            <TableCell>P{Number(fine.amount).toFixed(2)}</TableCell>
                                            <TableCell>P{Number(fine.paid_amount).toFixed(2)}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={fine.status} />
                                            </TableCell>
                                            <TableCell>
                                                {fine.status === 'unpaid' && (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            onClick={() => handleAction(fine, 'mark_paid')}
                                                        >
                                                            Mark Paid
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
                                                            onClick={() => handleAction(fine, 'hold_credentials')}
                                                        >
                                                            Hold Credentials
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {fines.last_page > 1 && (
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>
                                Showing {fines.from ?? 0}–{fines.to ?? 0} of {fines.total} results
                            </span>
                            <div className="flex gap-1">
                                {fines.links.map((link, i) => (
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
