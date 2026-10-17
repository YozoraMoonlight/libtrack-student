import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AdminLayout from '@/layouts/admin-layout';
import type { Transaction } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Check, Pencil, X } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Props {
    transaction: Transaction;
}

function toDateStr(dateStr: string): string {
    return new Date(dateStr).toISOString().split('T')[0];
}

export default function CirculationShow({ transaction }: Props) {
    useLiveRefresh();
    const { auth } = usePage().props as any;
    const flash = (usePage().props as any).flash || {};
    const [editingDates, setEditingDates] = useState(false);

    const dateForm = useForm({
        borrowed_at: transaction.borrowed_at ? toDateStr(transaction.borrowed_at) : '',
        due_date: transaction.due_date ? toDateStr(transaction.due_date) : '',
    });

    const daysBetween = useMemo(() => {
        if (!dateForm.data.borrowed_at || !dateForm.data.due_date) return null;
        const start = new Date(dateForm.data.borrowed_at);
        const end = new Date(dateForm.data.due_date);
        return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }, [dateForm.data.borrowed_at, dateForm.data.due_date]);

    const daysDisplay = useMemo(() => {
        if (!transaction.borrowed_at || !transaction.due_date) return null;
        const start = new Date(transaction.borrowed_at);
        const end = new Date(transaction.due_date);
        return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }, [transaction.borrowed_at, transaction.due_date]);

    const handleDateSave = () => {
        dateForm.put(route('admin.circulation.update-dates', transaction.id), {
            onSuccess: () => setEditingDates(false),
        });
    };

    const handleDateCancel = () => {
        dateForm.setData({
            borrowed_at: transaction.borrowed_at ? toDateStr(transaction.borrowed_at) : '',
            due_date: transaction.due_date ? toDateStr(transaction.due_date) : '',
        });
        setEditingDates(false);
    };

    const canEdit = transaction.status !== 'returned';

    return (
        <AdminLayout user={auth.user}>
            <Head title="Transaction Details" />
            <div className="flex-1 overflow-auto p-6">
                <div className="mb-6">
                    <Link href={route('admin.circulation.index')}>
                        <Button variant="ghost" size="sm"><ArrowLeft size={16} className="mr-2" />Back to Circulation</Button>
                    </Link>
                </div>

                {flash.success && (
                    <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        {flash.success}
                    </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Transaction Details</CardTitle>
                            {canEdit && !editingDates && (
                                <Button variant="ghost" size="sm" onClick={() => setEditingDates(true)}>
                                    <Pencil size={14} className="mr-1" />Edit Dates
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Transaction ID</span>
                                <span className="font-medium">#{transaction.id}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Type</span>
                                <span className="font-medium capitalize">{transaction.type}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Status</span>
                                <StatusBadge status={transaction.status} />
                            </div>

                            {editingDates ? (
                                <>
                                    <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                                        <div>
                                            <Label htmlFor="edit_borrowed_at" className="text-xs text-gray-500">Borrowed Date</Label>
                                            <Input
                                                id="edit_borrowed_at"
                                                type="date"
                                                value={dateForm.data.borrowed_at}
                                                onChange={(e) => dateForm.setData('borrowed_at', e.target.value)}
                                                className="mt-1"
                                            />
                                            {dateForm.errors.borrowed_at && <p className="text-xs text-red-500 mt-1">{dateForm.errors.borrowed_at}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="edit_due_date" className="text-xs text-gray-500">Due Date</Label>
                                            <Input
                                                id="edit_due_date"
                                                type="date"
                                                value={dateForm.data.due_date}
                                                onChange={(e) => dateForm.setData('due_date', e.target.value)}
                                                className="mt-1"
                                            />
                                            {dateForm.errors.due_date && <p className="text-xs text-red-500 mt-1">{dateForm.errors.due_date}</p>}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            <strong>Duration:</strong>{' '}
                                            {daysBetween !== null ? (
                                                <span className={daysBetween < 0 ? 'text-red-500 font-medium' : ''}>
                                                    {daysBetween} day(s)
                                                </span>
                                            ) : '—'}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={handleDateSave} disabled={dateForm.processing}>
                                                <Check size={14} className="mr-1" />Save
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={handleDateCancel}>
                                                <X size={14} className="mr-1" />Cancel
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Borrowed At</span>
                                        <span>{new Date(transaction.borrowed_at).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Due Date</span>
                                        <span>{new Date(transaction.due_date).toLocaleString()}</span>
                                    </div>
                                    {daysDisplay !== null && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Duration</span>
                                            <span className="font-medium">{daysDisplay} day(s)</span>
                                        </div>
                                    )}
                                </>
                            )}

                            {transaction.returned_at && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Returned At</span>
                                    <span>{new Date(transaction.returned_at).toLocaleString()}</span>
                                </div>
                            )}
                            {transaction.notes && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Notes</span>
                                    <span>{transaction.notes}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Book Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {transaction.book && (
                                    <>
                                        <p className="font-medium">{transaction.book.title}</p>
                                        <p className="text-sm text-gray-500">by {transaction.book.author}</p>
                                        {/* The exact copy this loan was issued on — the
                                            only copy that can close it. */}
                                        <p className="text-sm text-gray-500">
                                            Copy:{' '}
                                            <span className="font-mono">
                                                {transaction.book_copy?.accession_number ?? 'untracked (pre-dates copy tracking)'}
                                            </span>
                                        </p>
                                        {transaction.book.isbn && <p className="text-sm text-gray-500">ISBN: {transaction.book.isbn}</p>}
                                        <Link href={route('admin.books.show', transaction.book.id)}>
                                            <Button variant="outline" size="sm" className="mt-2">View Book</Button>
                                        </Link>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Borrower Info</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {transaction.user && (
                                    <>
                                        <p className="font-medium">{transaction.user.name}</p>
                                        <p className="text-sm text-gray-500">{transaction.user.email}</p>
                                        {(transaction.user as any).student_id && (
                                            <p className="text-sm text-gray-500">ID: {(transaction.user as any).student_id}</p>
                                        )}
                                        <Link href={route('admin.users.show', transaction.user.id)}>
                                            <Button variant="outline" size="sm" className="mt-2">View User</Button>
                                        </Link>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {transaction.fines && transaction.fines.length > 0 && (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Fines</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Paid</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Description</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transaction.fines.map((fine) => (
                                        <TableRow key={fine.id}>
                                            <TableCell className="capitalize">{fine.type}</TableCell>
                                            <TableCell>P{parseFloat(fine.amount).toFixed(2)}</TableCell>
                                            <TableCell>P{parseFloat(fine.paid_amount).toFixed(2)}</TableCell>
                                            <TableCell><StatusBadge status={fine.status} /></TableCell>
                                            <TableCell>{fine.description || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AdminLayout>
    );
}
