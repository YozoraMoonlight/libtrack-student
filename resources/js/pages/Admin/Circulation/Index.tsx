import FlashMessages from '@/components/FlashMessages';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AdminLayout from '@/layouts/admin-layout';
import type { PaginatedResponse, Transaction } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeftRight, Eye, Inbox, Plus, RotateCcw, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Props {
    transactions: PaginatedResponse<Transaction>;
    filters: { search?: string; status?: string };
    /** Open loans a student asked to return from their own page. */
    pendingReturnRequests?: number;
}

export default function CirculationIndex({ transactions, filters, pendingReturnRequests = 0 }: Props) {
    useLiveRefresh();
    const { auth } = usePage().props as any;
    const [search, setSearch] = useState(filters.search || '');
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const didMountRef = useRef(false);

    useEffect(() => {
        // Skip the initial mount: otherwise every visit to this page (including
        // the redirect after a borrow/return) fires a redundant request that
        // wipes the success flash. Only run the debounced search on real input.
        if (!didMountRef.current) {
            didMountRef.current = true;
            return;
        }
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            router.get(route('admin.circulation.index'), { search: search || undefined, status: filters.status }, { preserveState: true, replace: true });
        }, 300);
        return () => clearTimeout(timerRef.current);
    }, [search]);

    const filterByStatus = (status?: string) => {
        router.get(route('admin.circulation.index'), { search: filters.search, status }, { preserveState: true, replace: true });
    };

    const statusTabs = [
        { label: 'All', value: undefined },
        { label: 'Active', value: 'active' },
        { label: 'Returned', value: 'returned' },
        { label: 'Overdue', value: 'overdue' },
    ];

    return (
        <AdminLayout user={auth.user}>
            <Head title="Circulation" />
            <div className="flex-1 overflow-auto p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Circulation</h1>
                    <div className="flex gap-2">
                        <Link href={route('admin.circulation.borrow')}>
                            <Button><Plus size={16} className="mr-2" />Borrow Book</Button>
                        </Link>
                        <Link href={route('admin.circulation.return')}>
                            <Button variant="outline"><RotateCcw size={16} className="mr-2" />Return Book</Button>
                        </Link>
                    </div>
                </div>

                {/* Where a borrow lands: "Book borrowed successfully." */}
                <FlashMessages className="mb-4" />

                {pendingReturnRequests > 0 && (
                    <Link
                        href={route('admin.circulation.return')}
                        className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                    >
                        <Inbox size={16} className="shrink-0" />
                        {pendingReturnRequests} student{pendingReturnRequests === 1 ? ' has' : 's have'} asked to return a book.
                        Open Return Book to confirm each one when you receive it.
                    </Link>
                )}

                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Search by student or book title..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex gap-1">
                        {statusTabs.map((tab) => (
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

                <div className="rounded-md border bg-white dark:bg-gray-800">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Book</TableHead>
                                <TableHead>Borrower</TableHead>
                                <TableHead>Borrowed</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Returned</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        <ArrowLeftRight size={40} className="mx-auto mb-2 opacity-20" />
                                        No transactions found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.data.map((t) => (
                                    <TableRow key={t.id}>
                                        <TableCell className="font-medium">
                                            {t.book?.title || 'N/A'}
                                            {/* Which physical copy left the shelf. */}
                                            {t.book_copy?.accession_number && (
                                                <span className="block font-mono text-xs font-normal text-gray-500">
                                                    {t.book_copy.accession_number}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>{t.user?.name || 'N/A'}</TableCell>
                                        <TableCell>{new Date(t.borrowed_at).toLocaleDateString()}</TableCell>
                                        <TableCell>{new Date(t.due_date).toLocaleDateString()}</TableCell>
                                        <TableCell>{t.returned_at ? new Date(t.returned_at).toLocaleDateString() : '-'}</TableCell>
                                        <TableCell><StatusBadge status={t.status} /></TableCell>
                                        <TableCell>
                                            <Link href={route('admin.circulation.show', t.id)}>
                                                <Button variant="ghost" size="sm"><Eye size={16} /></Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {transactions.last_page > 1 && (
                    <div className="mt-4 flex justify-center gap-1">
                        {transactions.links.map((link, i) => (
                            <Button
                                key={i}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url)}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
