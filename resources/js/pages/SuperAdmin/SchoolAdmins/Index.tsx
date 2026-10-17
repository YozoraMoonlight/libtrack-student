import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SuperAdminLayout from '@/layouts/superadmin-layout';
import { PaginatedResponse } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Ban, CheckCircle2, ShieldAlert, UserPlus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AdminUser {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    school_id: number | null;
    school?: { id: number; name: string; code: string };
    user_role: string;
    is_active: boolean;
    last_login_at: string | null;
}

interface School { id: number; name: string; code: string }

interface Props {
    admins: PaginatedResponse<AdminUser>;
    schools: School[];
    filters: { search?: string; school_id?: string };
}

export default function SchoolAdminsIndex({ admins, schools, filters }: Props) {
    const { auth, flash } = usePage().props as any;
    const [search, setSearch] = useState(filters.search ?? '');
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    const apply = (next: Record<string, string>) => {
        router.get(route('superadmin.school-admins.index'),
            { search, school_id: filters.school_id ?? '', ...next },
            { preserveState: true, replace: true });
    };

    useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current); }, []);
    const onSearch = (v: string) => {
        setSearch(v);
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => apply({ search: v }), 300);
    };

    const toggle = (a: AdminUser) => {
        if (!confirm(`${a.is_active ? 'Disable' : 'Enable'} ${a.name}?`)) return;
        router.post(route('superadmin.school-admins.toggle-active', a.id), {}, { preserveScroll: true });
    };

    return (
        <SuperAdminLayout user={auth?.user}>
            <Head title="School Admins"/>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">School Admins</h1>
                            <p className="text-sm text-stone-500">Each public high school is managed by its own admin.</p>
                        </div>
                        <Link href={route('superadmin.school-admins.create')}>
                            <Button className="gap-2 bg-amber-500 hover:bg-amber-600"><UserPlus size={16}/>Add School Admin</Button>
                        </Link>
                    </div>

                    {flash?.success && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{flash.success}</div>}

                    <div className="flex flex-wrap items-center gap-3">
                        <Input placeholder="Search by name or email…" value={search} onChange={e => onSearch(e.target.value)} className="max-w-xs"/>
                        <Select value={filters.school_id ?? ''} onValueChange={v => apply({ school_id: v === 'all' ? '' : v })}>
                            <SelectTrigger className="w-56"><SelectValue placeholder="All schools"/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All schools</SelectItem>
                                {schools.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="rounded-xl border bg-white shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>School</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {admins.data.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-stone-400">No school admins yet.</TableCell></TableRow>
                                ) : (
                                    admins.data.map(a => (
                                        <TableRow key={a.id}>
                                            <TableCell className="font-medium">{a.name}</TableCell>
                                            <TableCell className="text-stone-600">{a.email}</TableCell>
                                            <TableCell>{a.school?.name ?? '—'}</TableCell>
                                            <TableCell>
                                                {a.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"><CheckCircle2 size={12}/>Active</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"><ShieldAlert size={12}/>Disabled</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant={a.is_active ? 'destructive' : 'default'} size="sm" onClick={() => toggle(a)} className="gap-1">
                                                    {a.is_active ? <><Ban size={12}/>Disable</> : <><CheckCircle2 size={12}/>Enable</>}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </main>
        </SuperAdminLayout>
    );
}
