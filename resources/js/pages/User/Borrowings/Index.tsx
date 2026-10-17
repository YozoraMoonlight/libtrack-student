import QrScanner from '@/components/QrScanner';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import UserLayout from '@/layouts/user-layout';
import { PaginatedResponse, Transaction, User } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { BookOpen, Clock, QrCode, RotateCcw, Undo2, X } from 'lucide-react';
import { useState } from 'react';

/** A book still out, as the Return Books section needs it. */
interface ActiveLoan {
    id: number;
    book_title: string | null;
    book_author: string | null;
    accession_number: string | null;
    borrowed_at: string | null;
    due_date: string | null;
    status: 'active' | 'overdue';
    return_requested_at: string | null;
    return_request_method: 'qr' | 'manual' | null;
}

interface BorrowingsIndexProps {
    user: User;
    borrowings: PaginatedResponse<Transaction>;
    activeLoans: ActiveLoan[];
}

export default function BorrowingsIndex({ user, borrowings, activeLoans = [] }: BorrowingsIndexProps) {
    // A librarian confirming the return clears it from Return Books here too.
    useLiveRefresh();
    const flash = (usePage().props as any).flash || {};
    const [scannerOpen, setScannerOpen] = useState(false);
    const [busyId, setBusyId] = useState<number | 'scan' | null>(null);

    const isOverdue = (tx: Transaction) => {
        return tx.status !== 'returned' && tx.returned_at === null && new Date(tx.due_date) < new Date();
    };

    const totalFines = (tx: Transaction): number => {
        if (!tx.fines || tx.fines.length === 0) return 0;
        return tx.fines.reduce((sum, fine) => sum + parseFloat(fine.amount), 0);
    };

    const requestReturn = (loan: ActiveLoan) => {
        if (
            !window.confirm(
                `Return "${loan.book_title ?? 'this book'}"?\n\nBring the book to the library. The return is complete once the librarian receives it.`,
            )
        )
            return;
        setBusyId(loan.id);
        router.post(
            route('user.borrowings.return-request'),
            { transaction_id: loan.id },
            { preserveScroll: true, onFinish: () => setBusyId(null) },
        );
    };

    // The server matches the scanned label against this student's own loans.
    const handleScan = (qrData: string) => {
        setBusyId('scan');
        router.post(
            route('user.borrowings.return-request'),
            { scanned_qr: qrData.trim() },
            { preserveScroll: true, onFinish: () => setBusyId(null) },
        );
    };

    const cancelRequest = (loan: ActiveLoan) => {
        setBusyId(loan.id);
        router.delete(route('user.borrowings.return-request.cancel', loan.id), {
            preserveScroll: true,
            onFinish: () => setBusyId(null),
        });
    };

    return (
        <UserLayout user={user}>
            <Head title="My Borrowings" />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="flex flex-col gap-6">
                    {/* Page header */}
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Borrowings</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {borrowings.total} borrowing{borrowings.total !== 1 ? 's' : ''} total
                        </p>
                    </div>

                    {/* Flash messages */}
                    {flash.success && (
                        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
                            {flash.success}
                        </div>
                    )}
                    {flash.error && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                            {flash.error}
                        </div>
                    )}

                    {/* Return Books */}
                    <section className="rounded-xl border bg-white p-4 shadow-sm md:p-6 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    <Undo2 size={18} />
                                    Return Books
                                </h2>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Scan the QR label on the book, or press Return on it below. Then hand the book to the
                                    librarian — the return is complete once they confirm it.
                                </p>
                            </div>
                            <Button
                                onClick={() => setScannerOpen(true)}
                                disabled={activeLoans.length === 0 || busyId !== null}
                                className="gap-2"
                            >
                                <QrCode size={16} />
                                Return with QR
                            </Button>
                        </div>

                        {activeLoans.length === 0 ? (
                            <p className="mt-4 rounded-md bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                                You have no books to return.
                            </p>
                        ) : (
                            <ul className="mt-4 divide-y divide-gray-100 dark:divide-gray-700">
                                {activeLoans.map((loan) => {
                                    const overdue = loan.due_date !== null && new Date(loan.due_date) < new Date();
                                    return (
                                        <li key={loan.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                                    {loan.book_title ?? 'Untitled book'}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {loan.accession_number && <span className="font-mono">{loan.accession_number} · </span>}
                                                    Due{' '}
                                                    <span className={overdue ? 'font-medium text-red-600 dark:text-red-400' : ''}>
                                                        {loan.due_date ? new Date(loan.due_date).toLocaleDateString() : '—'}
                                                        {overdue && ' (Overdue)'}
                                                    </span>
                                                </p>
                                            </div>
                                            {loan.return_requested_at ? (
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                                        <Clock size={12} />
                                                        Waiting for librarian
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={busyId !== null}
                                                        onClick={() => cancelRequest(loan)}
                                                    >
                                                        <X size={14} className="mr-1" />
                                                        Cancel
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={busyId !== null}
                                                    onClick={() => requestReturn(loan)}
                                                >
                                                    <RotateCcw size={14} className="mr-1" />
                                                    Return
                                                </Button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    {/* Table */}
                    <div className="rounded-xl border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Book Title</TableHead>
                                    <TableHead>Borrowed Date</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Returned Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Fines</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {borrowings.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-16 text-center">
                                            <BookOpen size={40} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                                            <p className="text-base font-medium text-gray-500 dark:text-gray-400">No borrowings yet</p>
                                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                                Visit the library to borrow a book
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    borrowings.data.map((tx) => {
                                        const overdue = isOverdue(tx);
                                        const fineTotal = totalFines(tx);
                                        return (
                                            <TableRow key={tx.id}>
                                                <TableCell className="font-medium">
                                                    {tx.book?.title ?? `Book #${tx.book_id}`}
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(tx.borrowed_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={overdue ? 'font-medium text-red-600 dark:text-red-400' : ''}>
                                                        {new Date(tx.due_date).toLocaleDateString()}
                                                        {overdue && ' (Overdue)'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {tx.returned_at
                                                        ? new Date(tx.returned_at).toLocaleDateString()
                                                        : '—'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <StatusBadge status={tx.status} />
                                                        {tx.return_requested_at && tx.status !== 'returned' && (
                                                            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                                                                Return requested
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {fineTotal > 0 ? (
                                                        <span className="font-medium text-red-600 dark:text-red-400">
                                                            ₱{fineTotal.toFixed(2)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {borrowings.last_page > 1 && (
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>
                                Showing {borrowings.from ?? 0}–{borrowings.to ?? 0} of {borrowings.total} results
                            </span>
                            <div className="flex gap-1">
                                {borrowings.links.map((link, i) => (
                                    <Button
                                        key={i}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className="min-w-8"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <QrScanner
                    isOpen={scannerOpen}
                    onClose={() => setScannerOpen(false)}
                    onScan={handleScan}
                    title="Scan the Book's QR Label"
                />
            </main>
        </UserLayout>
    );
}
