import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AdminLayout from '@/layouts/admin-layout';
import type { PaginatedResponse, Transaction } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { BookOpen, Download, Package } from 'lucide-react';

interface CategoryBreakdown {
    id: number;
    name: string;
    books_count: number;
    total_copies_sum: number | null;
    available_copies_sum: number | null;
}

interface Props {
    tab: 'borrowing' | 'overdue' | 'inventory';
    transactions?: PaginatedResponse<Transaction>;
    overdueTransactions?: PaginatedResponse<Transaction>;
    statusCounts?: { available: number; borrowed: number; reserved: number; damaged: number; lost: number };
    totalBooks?: number;
    totalCopies?: number;
    availableCopies?: number;
    categoryBreakdown?: CategoryBreakdown[];
    filters: { status?: string; tab?: string };
}

const TABS = [
    { label: 'Borrowing History', value: 'borrowing' },
    { label: 'Overdue Report', value: 'overdue' },
    { label: 'Inventory Status', value: 'inventory' },
];

function daysOverdue(dueDate: string): number {
    return Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
}

export default function ReportsIndex({
    tab,
    transactions,
    overdueTransactions,
    statusCounts,
    totalBooks,
    totalCopies,
    availableCopies,
    categoryBreakdown,
    filters,
}: Props) {
    useLiveRefresh();
    const { auth } = usePage().props as any;

    const switchTab = (newTab: string) => {
        router.get(route('admin.reports.index'), { tab: newTab }, { preserveState: true, replace: true });
    };

    return (
        <AdminLayout user={auth.user}>
            <Head title="Reports" />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
                </div>

                {/* Tab buttons */}
                <div className="mb-6 flex gap-2">
                    {TABS.map((t) => (
                        <Button
                            key={t.value}
                            variant={tab === t.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => switchTab(t.value)}
                        >
                            {t.label}
                        </Button>
                    ))}
                </div>

                {/* Borrowing History Tab */}
                {tab === 'borrowing' && transactions && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Borrowing History</CardTitle>
                            <a
                                href={route('admin.reports.export', { type: 'borrowing', status: filters.status || undefined })}
                                download
                            >
                                <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    <Download size={14} />
                                    Export CSV
                                </Button>
                            </a>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Book</TableHead>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Borrowed</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Returned</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                No borrowing records found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        transactions.data.map((t) => (
                                            <TableRow key={t.id}>
                                                <TableCell className="font-medium">{t.book?.title || 'N/A'}</TableCell>
                                                <TableCell>{t.user?.name || 'N/A'}</TableCell>
                                                <TableCell>{new Date(t.borrowed_at).toLocaleDateString()}</TableCell>
                                                <TableCell>{new Date(t.due_date).toLocaleDateString()}</TableCell>
                                                <TableCell>{t.returned_at ? new Date(t.returned_at).toLocaleDateString() : '-'}</TableCell>
                                                <TableCell><StatusBadge status={t.status} /></TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>

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
                        </CardContent>
                    </Card>
                )}

                {/* Overdue Report Tab */}
                {tab === 'overdue' && overdueTransactions && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Overdue Report</CardTitle>
                            <a href={route('admin.reports.export', { type: 'overdue' })} download>
                                <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    <Download size={14} />
                                    Export CSV
                                </Button>
                            </a>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Book</TableHead>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Borrowed</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Days Overdue</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {overdueTransactions.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                No overdue transactions found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        overdueTransactions.data.map((t) => (
                                            <TableRow key={t.id}>
                                                <TableCell className="font-medium">{t.book?.title || 'N/A'}</TableCell>
                                                <TableCell>{t.user?.name || 'N/A'}</TableCell>
                                                <TableCell>{new Date(t.borrowed_at).toLocaleDateString()}</TableCell>
                                                <TableCell>{new Date(t.due_date).toLocaleDateString()}</TableCell>
                                                <TableCell className="font-medium text-red-600 dark:text-red-400">
                                                    {daysOverdue(t.due_date)} day{daysOverdue(t.due_date) !== 1 ? 's' : ''}
                                                </TableCell>
                                                <TableCell><StatusBadge status={t.status} /></TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>

                            {overdueTransactions.last_page > 1 && (
                                <div className="mt-4 flex justify-center gap-1">
                                    {overdueTransactions.links.map((link, i) => (
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
                        </CardContent>
                    </Card>
                )}

                {/* Inventory Status Tab */}
                {tab === 'inventory' && statusCounts && (
                    <div className="flex flex-col gap-6">
                        {/* Summary stat cards */}
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                            <StatCard title="Total Books" value={totalBooks ?? 0} icon={Package} />
                            <StatCard title="Total Copies" value={totalCopies ?? 0} icon={Package} />
                            <StatCard title="Available" value={availableCopies ?? 0} icon={BookOpen} />
                            <StatCard title="Borrowed" value={statusCounts.borrowed} icon={BookOpen} />
                            <StatCard title="Damaged" value={statusCounts.damaged} icon={BookOpen} />
                            <StatCard title="Lost" value={statusCounts.lost} icon={BookOpen} />
                        </div>

                        {/* Category breakdown table */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Books by Category</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">Books</TableHead>
                                            <TableHead className="text-right">Total Copies</TableHead>
                                            <TableHead className="text-right">Available Copies</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(!categoryBreakdown || categoryBreakdown.length === 0) ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                                    No categories found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <>
                                                {categoryBreakdown.map((cat) => (
                                                    <TableRow key={cat.id}>
                                                        <TableCell className="font-medium">{cat.name}</TableCell>
                                                        <TableCell className="text-right">{cat.books_count}</TableCell>
                                                        <TableCell className="text-right">{cat.total_copies_sum ?? 0}</TableCell>
                                                        <TableCell className="text-right">{cat.available_copies_sum ?? 0}</TableCell>
                                                    </TableRow>
                                                ))}
                                                <TableRow className="border-t-2 font-semibold">
                                                    <TableCell>Total</TableCell>
                                                    <TableCell className="text-right">{totalBooks ?? 0}</TableCell>
                                                    <TableCell className="text-right">{totalCopies ?? 0}</TableCell>
                                                    <TableCell className="text-right">{availableCopies ?? 0}</TableCell>
                                                </TableRow>
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
        </AdminLayout>
    );
}
