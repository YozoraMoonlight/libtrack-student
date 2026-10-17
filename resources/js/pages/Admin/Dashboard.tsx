import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AdminLayout from '@/layouts/admin-layout';
import type { Transaction } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowLeftRight, BookOpen, Receipt, Users } from 'lucide-react';

interface Stats {
    totalBooks: number;
    totalUsers: number;
    activeBorrows: number;
    overdueItems: number;
    unpaidFines: number;
}

interface Props {
    stats: Stats;
    recentTransactions: Transaction[];
    overdueItems: Transaction[];
}

function daysOverdue(dueDate: string): number {
    return Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
}

export default function AdminDashboard({ stats, recentTransactions, overdueItems }: Props) {
    useLiveRefresh();
    const { auth } = usePage().props as any;

    return (
        <AdminLayout user={auth.user}>
            <Head title="Dashboard" />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="flex flex-col gap-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-5">
                        <StatCard
                            title="Total Books"
                            value={stats.totalBooks}
                            icon={BookOpen}
                        />
                        <StatCard
                            title="Total Students"
                            value={stats.totalUsers}
                            icon={Users}
                        />
                        <StatCard
                            title="Active Borrows"
                            value={stats.activeBorrows}
                            icon={ArrowLeftRight}
                        />
                        <StatCard
                            title="Overdue Items"
                            value={stats.overdueItems}
                            icon={AlertTriangle}
                            description={stats.overdueItems > 0 ? 'Needs attention' : undefined}
                        />
                        <StatCard
                            title="Unpaid Fines"
                            value={`P${Number(stats.unpaidFines).toFixed(2)}`}
                            icon={Receipt}
                        />
                    </div>

                    {/* Two-column grid */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Recent Transactions */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
                                <Link
                                    href={route('admin.circulation.index')}
                                    className="text-sm text-primary hover:underline"
                                >
                                    View all
                                </Link>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Book</TableHead>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentTransactions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="py-6 text-center text-gray-500">
                                                    No recent transactions.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            recentTransactions.map((t) => (
                                                <TableRow key={t.id}>
                                                    <TableCell className="max-w-[120px] truncate font-medium">
                                                        {t.book?.title ?? 'N/A'}
                                                    </TableCell>
                                                    <TableCell>{t.user?.name ?? 'N/A'}</TableCell>
                                                    <TableCell>{new Date(t.borrowed_at).toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        <StatusBadge status={t.status} />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Overdue Items */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base font-semibold">Overdue Items</CardTitle>
                                <Link
                                    href={route('admin.reports.index', { tab: 'overdue' })}
                                    className="text-sm text-primary hover:underline"
                                >
                                    View report
                                </Link>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Book</TableHead>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Due Date</TableHead>
                                            <TableHead>Days Overdue</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {overdueItems.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="py-6 text-center text-gray-500">
                                                    No overdue items.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            overdueItems.map((t) => (
                                                <TableRow key={t.id}>
                                                    <TableCell className="max-w-[120px] truncate font-medium">
                                                        {t.book?.title ?? 'N/A'}
                                                    </TableCell>
                                                    <TableCell>{t.user?.name ?? 'N/A'}</TableCell>
                                                    <TableCell>{new Date(t.due_date).toLocaleDateString()}</TableCell>
                                                    <TableCell className="font-medium text-red-600 dark:text-red-400">
                                                        {daysOverdue(t.due_date)} day{daysOverdue(t.due_date) !== 1 ? 's' : ''}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </AdminLayout>
    );
}
