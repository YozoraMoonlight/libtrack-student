import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AdminLayout from '@/layouts/admin-layout';
import { PaginatedResponse, User } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Lock, ShieldCheck, Unlock } from 'lucide-react';

interface Hold {
    id: number;
    reason: string;
    amount: string | number;
    status: 'active' | 'released';
    released_at: string | null;
    notes: string | null;
    created_at: string;
    user: { id: number; name: string; email: string; lrn: string | null; student_id: string | null; school?: { name: string } };
    released_by?: { id: number; name: string };
}

interface Props {
    holds: PaginatedResponse<Hold>;
    filters: { status?: string };
}

export default function CredentialHoldsIndex({ holds, filters }: Props) {
    useLiveRefresh();
    const { auth, flash } = usePage().props as any;
    const currentUser: User = auth?.user;
    const prefix = currentUser?.user_role === 'librarian' ? 'librarian' : 'admin';

    const apply = (next: Record<string, string>) => {
        router.get(route(`${prefix}.credential-holds.index`), { status: filters.status ?? '', ...next }, { preserveState: true, replace: true });
    };

    const release = (h: Hold) => {
        if (!confirm(`Release credentials hold for ${h.user.name}?`)) return;
        router.post(route(`${prefix}.credential-holds.release`, h.id), {}, { preserveScroll: true });
    };

    return (
        <AdminLayout user={currentUser}>
            <Head title="Credential Holds"/>
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6">
                <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2"><Lock className="h-6 w-6 text-orange-600"/>Credential Holds</h1>
                            <p className="text-sm text-stone-500">Students whose school credentials (Form 137, Good Moral) are on hold due to library obligations.</p>
                        </div>
                        <Select value={filters.status ?? 'active'} onValueChange={v => apply({ status: v })}>
                            <SelectTrigger className="w-44"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="released">Released</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {flash?.success && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{flash.success}</div>}

                    <div className="rounded-xl border bg-white shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>LRN</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Placed</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {holds.data.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="py-12 text-center text-stone-400">
                                        <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-emerald-500"/>
                                        No {filters.status === 'released' ? 'released' : 'active'} holds. All students are clear.
                                    </TableCell></TableRow>
                                ) : (
                                    holds.data.map(h => (
                                        <TableRow key={h.id}>
                                            <TableCell className="font-medium">
                                                {h.user.name}
                                                <div className="text-xs text-stone-500">{h.user.school?.name}</div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{h.user.lrn ?? h.user.student_id ?? '—'}</TableCell>
                                            <TableCell className="text-sm">{h.reason}</TableCell>
                                            <TableCell className="text-right font-medium">{Number(h.amount) > 0 ? `₱${Number(h.amount).toFixed(2)}` : '—'}</TableCell>
                                            <TableCell className="text-xs text-stone-500">{new Date(h.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                {h.status === 'active' ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                                                        <Lock size={10}/>Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                                        <ShieldCheck size={10}/>Released
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {h.status === 'active' ? (
                                                    <Button size="sm" onClick={() => release(h)} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                                                        <Unlock size={12}/>Release
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-stone-400">{h.released_by?.name ?? 'auto'}</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {holds.last_page > 1 && (
                        <div className="flex items-center justify-between text-sm text-stone-600">
                            <span>Showing {holds.from ?? 0}–{holds.to ?? 0} of {holds.total}</span>
                            <div className="flex gap-1">
                                {holds.links.map((l, i) => (
                                    <Button key={i} variant={l.active ? 'default' : 'outline'} size="sm" disabled={!l.url}
                                        onClick={() => l.url && router.get(l.url)}
                                        dangerouslySetInnerHTML={{ __html: l.label }}
                                        className="min-w-8"/>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </AdminLayout>
    );
}
