import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import UserLayout from '@/layouts/user-layout';
import type { Transaction } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeftRight, BookOpen, QrCode, Receipt, Search } from 'lucide-react';

interface Stats {
    activeBorrows: number;
    totalBorrowed: number;
    unpaidFines: number;
}

interface StudentInfo {
    name: string;
    email: string;
    student_id: string | null;
    school_name: string | null;
}

interface Props {
    stats: Stats;
    qrCode: string;
    upcomingDue: Transaction[];
    recentActivity: Transaction[];
    user: StudentInfo;
}

export default function UserDashboard({ stats, qrCode, upcomingDue, recentActivity, user: student }: Props) {
    // The student's QR never changes while the page is open.
    useLiveRefresh({ except: ['qrCode'] });
    const { auth } = usePage().props as any;

    return (
        <UserLayout user={auth.user}>
            <Head title="Dashboard" />

            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="flex flex-col gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
                        <p className="mt-1 text-gray-500 dark:text-gray-400">
                            Welcome back, {auth.user.name}!
                        </p>
                    </div>

                    <Card>
                        <CardContent className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:items-start">
                            <div className="flex flex-col items-center gap-3">
                                {qrCode && (
                                    <img
                                        src={qrCode}
                                        alt="My QR Code"
                                        className="h-48 w-48 rounded-lg border border-gray-200 dark:border-gray-700"
                                    />
                                )}
                            </div>

                            <div className="flex flex-col items-center gap-1 text-center sm:items-start sm:text-left">
                                <div className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-100">
                                    <QrCode size={20} />
                                    My Library QR Code
                                </div>

                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {auth.user.name}
                                </p>

                                {(student?.student_id ?? auth.user.student_id) && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        LRN: {student?.student_id ?? auth.user.student_id}
                                    </p>
                                )}

                                {student?.school_name && (
                                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                        {student.school_name}
                                    </p>
                                )}

                                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                                    Present this QR code to the librarian when borrowing or returning books.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                        <StatCard title="Active Borrows" value={stats.activeBorrows} icon={BookOpen} />
                        <StatCard title="Total Borrowed" value={stats.totalBorrowed} icon={ArrowLeftRight} />
                        <StatCard title="Unpaid Fines" value={`P${Number(stats.unpaidFines).toFixed(2)}`} icon={Receipt} />
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold">Upcoming Due Dates</CardTitle>
                            </CardHeader>

                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Book</TableHead>
                                            <TableHead>Borrowed</TableHead>
                                            <TableHead>Due Date</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {upcomingDue.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="py-6 text-center text-gray-500">
                                                    No upcoming due dates.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            upcomingDue.map((t) => (
                                                <TableRow key={t.id}>
                                                    <TableCell className="max-w-[120px] truncate font-medium">
                                                        {t.book?.title ?? 'N/A'}
                                                    </TableCell>
                                                    <TableCell>{new Date(t.borrowed_at).toLocaleDateString()}</TableCell>
                                                    <TableCell>{new Date(t.due_date).toLocaleDateString()}</TableCell>
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

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                            </CardHeader>

                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Book</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Due Date</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>

                                    <TableBody>
                                        {recentActivity.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="py-6 text-center text-gray-500">
                                                    No recent activity.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            recentActivity.map((t) => (
                                                <TableRow key={t.id}>
                                                    <TableCell className="max-w-[120px] truncate font-medium">
                                                        {t.book?.title ?? 'N/A'}
                                                    </TableCell>
                                                    <TableCell>{new Date(t.borrowed_at).toLocaleDateString()}</TableCell>
                                                    <TableCell>{new Date(t.due_date).toLocaleDateString()}</TableCell>
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
                    </div>

                    <div>
                        <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
                            Quick Actions
                        </h2>

                        <div className="flex flex-wrap gap-3">
                            <Link
                                href={route('user.books.index')}
                                className="flex items-center gap-2 rounded-lg border bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                <Search size={16} />
                                Browse Books
                            </Link>

                            <Link
                                href={route('user.borrowings.index')}
                                className="flex items-center gap-2 rounded-lg border bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                                <BookOpen size={16} />
                                My Borrowings
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </UserLayout>
    );
}