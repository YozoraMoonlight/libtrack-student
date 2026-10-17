import StatusBadge from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import LibrarianLayout from '@/layouts/librarian-layout';
import type { Transaction } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, BookOpen, Clock, Library, Users } from 'lucide-react';

interface Stats {
    borrowsToday: number;
    returnsToday: number;
    activeBorrows: number;
    overdueItems: number;
    studentsAtSchool: number;
}

interface DashboardUser {
    name: string;
    email: string;
    school_name?: string | null;
    user_role?: string;
}

interface Props {
    user: DashboardUser;
    stats: Stats;
    todaysActivity: Transaction[];
    overdueItems: Transaction[];
}

function daysOverdue(dueDate: string): number {
    return Math.floor((Date.now() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
}

export default function LibrarianDashboard({ user, stats, todaysActivity, overdueItems }: Props) {
    useLiveRefresh();
    const { auth } = usePage().props as any;
    const layoutUser = auth?.user || user;

    return (
        <LibrarianLayout user={{ name: layoutUser.name, email: layoutUser.email, school_name: user.school_name }}>
            <Head title="Librarian Dashboard" />
            <main className="flex-1 overflow-y-auto bg-[#f5f9f9] p-4 md:p-6">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-700">Librarian desk</p>
                        <h1 className="text-2xl font-bold text-stone-900">Welcome, {user.name.split(' ')[0]} 👋</h1>
                        <p className="text-sm text-stone-500">{user.school_name ?? 'Your school'} · today is {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                        <DeskStat icon={ArrowUpFromLine} label="Borrows today" value={stats.borrowsToday} accent="emerald" />
                        <DeskStat icon={ArrowDownToLine} label="Returns today" value={stats.returnsToday} accent="teal" />
                        <DeskStat icon={Clock} label="Active borrows" value={stats.activeBorrows} accent="blue" />
                        <DeskStat icon={AlertTriangle} label="Overdue" value={stats.overdueItems} accent="red" />
                        <DeskStat icon={Users} label="Students" value={stats.studentsAtSchool} accent="amber" />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <QuickAction href="/librarian/circulation/borrow" icon={ArrowUpFromLine} label="Issue a book" hint="Scan QR or pick a student" />
                        <QuickAction href="/librarian/circulation/return" icon={ArrowDownToLine} label="Process return" hint="Mark items as returned" />
                        <QuickAction href="/librarian/students" icon={Library} label="Students master list" hint="Browse all students at your school" />
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base font-semibold">Today's Activity</CardTitle>
                                <Link href="/librarian/circulation" className="text-sm text-teal-700 hover:underline">View all</Link>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Book</TableHead>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Time</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {todaysActivity.length === 0 ? (
                                            <TableRow><TableCell colSpan={4} className="py-6 text-center text-stone-500">No activity yet today.</TableCell></TableRow>
                                        ) : (
                                            todaysActivity.map((t) => (
                                                <TableRow key={t.id}>
                                                    <TableCell className="max-w-[160px] truncate font-medium">{t.book?.title ?? 'N/A'}</TableCell>
                                                    <TableCell>{t.user?.name ?? 'N/A'}</TableCell>
                                                    <TableCell>{new Date((t as any).updated_at ?? t.borrowed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                                                    <TableCell><StatusBadge status={t.status} /></TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-base font-semibold">Overdue items</CardTitle>
                                <Link href="/librarian/reports?tab=overdue" className="text-sm text-teal-700 hover:underline">View report</Link>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Book</TableHead>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Due</TableHead>
                                            <TableHead>Days late</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {overdueItems.length === 0 ? (
                                            <TableRow><TableCell colSpan={4} className="py-6 text-center text-stone-500">No overdue items 🎉</TableCell></TableRow>
                                        ) : (
                                            overdueItems.map((t) => (
                                                <TableRow key={t.id}>
                                                    <TableCell className="max-w-[160px] truncate font-medium">{t.book?.title ?? 'N/A'}</TableCell>
                                                    <TableCell>{t.user?.name ?? 'N/A'}</TableCell>
                                                    <TableCell>{new Date(t.due_date).toLocaleDateString()}</TableCell>
                                                    <TableCell className="font-medium text-red-600">
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
        </LibrarianLayout>
    );
}

function DeskStat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent: string }) {
    const palette: Record<string, string> = {
        emerald: 'bg-emerald-50 text-emerald-700',
        teal: 'bg-teal-50 text-teal-700',
        blue: 'bg-blue-50 text-blue-700',
        red: 'bg-red-50 text-red-700',
        amber: 'bg-amber-50 text-amber-700',
    };
    return (
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${palette[accent] ?? palette.teal}`}>
                    <Icon size={16}/>
                </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-stone-900">{value.toLocaleString()}</p>
        </div>
    );
}

function QuickAction({ href, icon: Icon, label, hint }: { href: string; icon: any; label: string; hint: string }) {
    return (
        <Link href={href} className="group flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:border-teal-300 hover:shadow-md">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-50 text-teal-700 transition-colors group-hover:bg-teal-100">
                <Icon size={20} />
            </div>
            <div className="flex-1">
                <p className="font-semibold text-stone-900">{label}</p>
                <p className="text-xs text-stone-500">{hint}</p>
            </div>
            <BookOpen size={16} className="text-stone-300 transition-colors group-hover:text-teal-500" />
        </Link>
    );
}
