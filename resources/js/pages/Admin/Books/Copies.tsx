import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AdminLayout from '@/layouts/admin-layout';
import type { BookCopy, User } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Download, Plus, Printer, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface CopyRow extends BookCopy {
    qr_image: string;
    borrower?: string | null;
    due_date?: string | null;
}

interface Props {
    book: {
        id: number;
        title: string;
        author: string;
        isbn: string | null;
        location: string | null;
        total_copies: number;
        available_copies: number;
        category: string | null;
    };
    copies: CopyRow[];
    manualStatuses: string[];
    canManage: boolean;
}

export default function BookCopies({ book, copies, manualStatuses, canManage }: Props) {
    useLiveRefresh();
    const { auth, flash } = usePage().props as any;
    const currentUser: User = auth?.user;
    const prefix = currentUser?.user_role === 'librarian' ? 'librarian' : 'admin';

    const [editing, setEditing] = useState<number | null>(null);
    const [status, setStatus] = useState('available');
    const [condition, setCondition] = useState('');

    const startEdit = (copy: CopyRow) => {
        setEditing(copy.id);
        setStatus(manualStatuses.includes(copy.status) ? copy.status : 'available');
        setCondition(copy.condition ?? '');
    };

    const saveEdit = (copy: CopyRow) => {
        router.put(
            route(`${prefix}.books.copies.update`, { book: book.id, copy: copy.id }),
            { status, condition },
            { preserveScroll: true, onSuccess: () => setEditing(null) },
        );
    };

    const addCopy = () => {
        router.post(route(`${prefix}.books.copies.store`, book.id), {}, { preserveScroll: true });
    };

    const removeCopy = (copy: CopyRow) => {
        if (!window.confirm(`Remove ${copy.accession_number ?? `copy #${copy.copy_number}`}? This cannot be undone.`)) return;
        router.delete(route(`${prefix}.books.copies.destroy`, { book: book.id, copy: copy.id }), { preserveScroll: true });
    };

    return (
        <AdminLayout user={currentUser}>
            <Head title={`Copies — ${book.title}`} />

            {/*
              Print styles: the browser print dialog is the label printer here.
              Everything except the label grid is hidden so a sheet of QR labels
              comes out ready to cut, one per physical copy.
            */}
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #copy-labels, #copy-labels * { visibility: visible !important; }
                    #copy-labels {
                        position: absolute; left: 0; top: 0; width: 100%;
                        display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm;
                        padding: 8mm;
                    }
                    .copy-label { break-inside: avoid; border: 1px solid #999; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="mx-auto max-w-5xl space-y-6">
                    <div className="no-print">
                        <Link
                            href={route(`${prefix}.books.show`, book.id)}
                            className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800"
                        >
                            <ArrowLeft size={14} />
                            Back to {book.title}
                        </Link>
                    </div>

                    <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Copies &amp; QR labels</h1>
                            <p className="text-sm text-gray-500">
                                {book.title} by {book.author} — {book.available_copies} of {book.total_copies} on the shelf.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {canManage && (
                                <Button variant="outline" onClick={addCopy} className="gap-2">
                                    <Plus size={15} />
                                    Add copy
                                </Button>
                            )}
                            <Button onClick={() => window.print()} className="gap-2 bg-stone-900 hover:bg-stone-800">
                                <Printer size={15} />
                                Print all labels
                            </Button>
                        </div>
                    </div>

                    {flash?.success && (
                        <div className="no-print rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="no-print rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                            {flash.error}
                        </div>
                    )}

                    <div className="no-print rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <p className="font-semibold">Every copy has its own QR code.</p>
                        <p className="mt-1">
                            Stick the matching label on each physical book. A loan is recorded against the exact copy that was
                            scanned, so a student can no longer return a classmate&apos;s copy against their own borrow.
                        </p>
                    </div>

                    {/* The printable sheet. */}
                    <div id="copy-labels" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {copies.map((copy, index) => (
                            <Card key={copy.id} className="copy-label">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="font-mono text-sm">
                                            {copy.accession_number ?? `Copy #${copy.copy_number}`}
                                        </CardTitle>
                                        <span className="no-print">
                                            <StatusBadge status={copy.status} />
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center gap-2">
                                    <img
                                        src={copy.qr_image}
                                        alt={`QR code for ${copy.accession_number ?? `copy ${copy.copy_number}`}`}
                                        className="h-32 w-32"
                                    />
                                    <p className="text-center text-xs font-medium text-gray-700 dark:text-gray-300">{book.title}</p>
                                    <p className="text-center text-[10px] text-gray-500">
                                        {/* Position in the current run, not copy_number — retiring a
                                            copy leaves a hole, so copy_number can exceed the total and
                                            print a nonsense "Copy 5 of 4". */}
                                        Copy {index + 1} of {copies.length}
                                        {book.location ? ` • ${book.location}` : ''}
                                    </p>

                                    <div className="no-print w-full space-y-2 pt-2">
                                        {copy.borrower && (
                                            <p className="rounded bg-stone-100 px-2 py-1 text-center text-xs text-stone-700">
                                                With {copy.borrower}
                                                {copy.due_date ? ` • due ${copy.due_date}` : ''}
                                            </p>
                                        )}
                                        {copy.condition && !copy.borrower && (
                                            <p className="text-center text-xs text-stone-500">Condition: {copy.condition}</p>
                                        )}

                                        {editing === copy.id ? (
                                            <div className="space-y-2 rounded-lg border p-2">
                                                <div>
                                                    <Label className="text-xs">Status</Label>
                                                    <Select value={status} onValueChange={setStatus}>
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {manualStatuses.map((s) => (
                                                                <SelectItem key={s} value={s} className="capitalize">
                                                                    {s}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Condition note</Label>
                                                    <Input
                                                        value={condition}
                                                        onChange={(e) => setCondition(e.target.value)}
                                                        placeholder="e.g. torn cover"
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" className="flex-1" onClick={() => saveEdit(copy)}>
                                                        Save
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <a
                                                    href={route(`${prefix}.books.copies.qr-code`, { book: book.id, copy: copy.id })}
                                                    download
                                                    className="flex-1"
                                                >
                                                    <Button variant="outline" size="sm" className="w-full gap-1">
                                                        <Download size={13} />
                                                        QR
                                                    </Button>
                                                </a>
                                                {canManage && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => startEdit(copy)}
                                                            disabled={copy.status === 'borrowed'}
                                                            title={
                                                                copy.status === 'borrowed'
                                                                    ? 'Process the return before editing this copy'
                                                                    : 'Edit condition'
                                                            }
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => removeCopy(copy)}
                                                            disabled={copy.status === 'borrowed'}
                                                        >
                                                            <Trash2 size={13} />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </main>
        </AdminLayout>
    );
}
