import { useLiveRefresh } from '@/hooks/use-live-refresh';
import SuperAdminLayout from '@/layouts/superadmin-layout';
import { Head, Link, usePage } from '@inertiajs/react';
import { BookOpen, Building2, Lock, Receipt, ShieldAlert, Users } from 'lucide-react';

interface Stats {
    schools_count: number;
    active_schools: number;
    students_count: number;
    school_admins_count: number;
    librarians_count: number;
    books_count: number;
    active_borrows: number;
    overdue_count: number;
    unpaid_fines_total: number;
    active_holds: number;
}

interface PerSchool {
    id: number;
    name: string;
    code: string;
    is_active: boolean;
    students_count: number;
    librarians_count: number;
    books_count: number;
}

interface Props {
    stats: Stats;
    per_school: PerSchool[];
}

export default function SuperAdminDashboard({ stats, per_school }: Props) {
    useLiveRefresh();
    const { auth } = usePage().props as any;
    return (
        <SuperAdminLayout user={auth?.user}>
            <Head title="Super Admin Dashboard" />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
                        <p className="text-sm text-stone-500">Cross-school overview of LIBTRACK across all public high schools.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <StatCard icon={Building2} label="Schools" value={`${stats.active_schools} / ${stats.schools_count}`} hint="Active / Total" color="blue"/>
                        <StatCard icon={Users} label="Students" value={stats.students_count.toLocaleString()} color="emerald"/>
                        <StatCard icon={BookOpen} label="Books (copies)" value={Number(stats.books_count).toLocaleString()} color="amber"/>
                        <StatCard icon={Receipt} label="Active Borrows" value={stats.active_borrows.toLocaleString()} color="purple"/>
                        <StatCard icon={ShieldAlert} label="Overdue Books" value={stats.overdue_count.toLocaleString()} color="red"/>
                        <StatCard icon={Lock} label="Active Holds" value={stats.active_holds.toLocaleString()} color="orange"/>
                        <StatCard icon={Receipt} label="Unpaid Fines (₱)" value={Number(stats.unpaid_fines_total).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} color="red"/>
                        <StatCard icon={Users} label="Staff" value={`${stats.school_admins_count + stats.librarians_count}`} hint={`${stats.school_admins_count} admins · ${stats.librarians_count} librarians`} color="stone"/>
                    </div>

                    <div className="rounded-xl border bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Per-School Breakdown</h2>
                            <Link href="/admin/schools" className="text-sm text-amber-600 hover:underline">Manage schools →</Link>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-xs uppercase tracking-wider text-stone-500">
                                        <th className="py-2">School</th>
                                        <th>Code</th>
                                        <th className="text-right">Students</th>
                                        <th className="text-right">Librarians</th>
                                        <th className="text-right">Books</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {per_school.length === 0 && (
                                        <tr><td colSpan={6} className="py-6 text-center text-stone-400">No schools yet. <Link href="/admin/schools/create" className="text-amber-600">Create one →</Link></td></tr>
                                    )}
                                    {per_school.map(s => (
                                        <tr key={s.id} className="border-b last:border-0 hover:bg-stone-50">
                                            <td className="py-3 font-medium">{s.name}</td>
                                            <td className="font-mono text-xs">{s.code}</td>
                                            <td className="text-right">{s.students_count}</td>
                                            <td className="text-right">{s.librarians_count}</td>
                                            <td className="text-right">{s.books_count}</td>
                                            <td>
                                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                                                    {s.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </SuperAdminLayout>
    );
}

function StatCard({ icon: Icon, label, value, hint, color }: { icon: any; label: string; value: string | number; hint?: string; color: string }) {
    const palette: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-700',
        emerald: 'bg-emerald-50 text-emerald-700',
        amber: 'bg-amber-50 text-amber-700',
        purple: 'bg-purple-50 text-purple-700',
        red: 'bg-red-50 text-red-700',
        orange: 'bg-orange-50 text-orange-700',
        stone: 'bg-stone-100 text-stone-700',
    };
    return (
        <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${palette[color] ?? palette.stone}`}>
                    <Icon size={16}/>
                </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-stone-900">{value}</p>
            {hint && <p className="text-xs text-stone-400">{hint}</p>}
        </div>
    );
}
