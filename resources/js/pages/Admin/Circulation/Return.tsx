import QrScanner from '@/components/QrScanner';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AdminLayout from '@/layouts/admin-layout';
import type { Transaction } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Inbox, QrCode, RotateCcw, Search, UserRound, X } from 'lucide-react';
import { useState } from 'react';

interface Props {
    transactions: Transaction[];
}

export default function ReturnPage({ transactions }: Props) {
    useLiveRefresh();
    const { auth } = usePage().props as any;
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanTarget, setScanTarget] = useState<'book' | 'student'>('book');
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    // The last book scan and the loans it is valid for: one loan for a copy
    // label, possibly several for a title label shared by every copy.
    const [scan, setScan] = useState<{ payload: string; loanIds: number[] } | null>(null);
    // The borrower whose student QR was scanned. Narrows the desk to their
    // loans, and is sent with the return so the server can check it's theirs.
    const [student, setStudent] = useState<{ id: number; name: string; payload: string } | null>(null);
    const [scanFeedback, setScanFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
    // Loans a student asked to return from their own page, waiting for the book.
    const [onlyRequested, setOnlyRequested] = useState(false);
    const flash = (usePage().props as any).flash || {};

    const requestedCount = transactions.filter((t) => t.return_requested_at).length;

    const filtered = transactions.filter((t) => {
        if (onlyRequested && !t.return_requested_at) return false;
        if (student && t.user_id !== student.id) return false;
        if (!search) return true;
        const term = search.toLowerCase();
        return (
            t.book?.title?.toLowerCase().includes(term) ||
            t.book_copy?.accession_number?.toLowerCase().includes(term) ||
            t.user?.name?.toLowerCase().includes(term) ||
            t.user?.student_id?.toLowerCase().includes(term)
        );
    });

    const openScanner = (target: 'book' | 'student') => {
        setScanTarget(target);
        setScannerOpen(true);
    };

    // Either button accepts either kind of QR — the payload says what it is.
    const handleScan = (qrData: string) => {
        const cleaned = qrData.trim();
        console.log('[Return] QR scanned:', cleaned);

        if (cleaned.startsWith('LIBTRACK:USER:')) {
            handleStudentScan(cleaned);
        } else {
            handleBookScan(cleaned);
        }
    };

    const handleStudentScan = (payload: string) => {
        const uuid = payload.slice('LIBTRACK:USER:'.length).trim();
        const loans = transactions.filter((t) => t.user?.qr_code === uuid);

        if (loans.length === 0) {
            setScanFeedback({
                tone: 'error',
                text: 'That student has no books out right now, or belongs to another school.',
            });
            return;
        }

        const name = loans[0].user?.name ?? 'This student';
        setStudent({ id: loans[0].user_id, name, payload: `LIBTRACK:USER:${uuid}` });
        setSearch('');

        // A book scanned before the student still counts if the loan is theirs.
        const stillValid = scan ? scan.loanIds.filter((id) => loans.some((l) => l.id === id)) : [];
        if (stillValid.length > 0 && scan) {
            setScan({ ...scan, loanIds: stillValid });
            setSelectedId(stillValid.length === 1 ? stillValid[0] : null);
            setScanFeedback({ tone: 'success', text: `${name} — the scanned book is theirs. Press Return to confirm.` });
            return;
        }

        setScan(null);
        setSelectedId(loans.length === 1 ? loans[0].id : null);
        setScanFeedback({
            tone: 'success',
            text: `${name} has ${loans.length} book${loans.length === 1 ? '' : 's'} out. Scan the book being returned.`,
        });
    };

    /**
     * Resolve a book scan to the loan(s) it can close. A copy label names ONE
     * physical copy, so it matches the one loan issued on it — matching on the
     * title used to close the first loan for the title, letting a classmate's
     * copy close your own loan.
     *
     * `LIBTRACK:BOOK:` is a TITLE label (the book page and the student's
     * Browse Books QR show one). It can't tell copies apart, so it matches
     * every active loan on that title and the server records the return as
     * title-verified.
     */
    const handleBookScan = (cleaned: string) => {
        const prefix = ['LIBTRACK:COPY:', 'LIBTRACK:BOOK:'].find((p) => cleaned.startsWith(p));
        if (!prefix) {
            setScan(null);
            setScanFeedback({
                tone: 'error',
                text: `Expected a book or student QR code, got: "${cleaned.substring(0, 40)}${cleaned.length > 40 ? '…' : ''}".`,
            });
            return;
        }

        const uuid = cleaned.slice(prefix.length).trim();

        // 1. The label of one physical copy (legacy BOOK: labels on copy #1 too).
        const copyMatch = transactions.find((t) => t.book_copy?.qr_code === uuid);
        if (copyMatch) {
            if (student && copyMatch.user_id !== student.id) {
                setScan(null);
                setSelectedId(null);
                setScanFeedback({
                    tone: 'error',
                    text: `${copyMatch.book_copy?.accession_number ?? 'That copy'} was borrowed by ${copyMatch.user?.name ?? 'another student'}, not ${student.name}.`,
                });
                return;
            }

            // Carried through to the server, which re-checks it against the loan.
            setScan({ payload: `LIBTRACK:COPY:${uuid}`, loanIds: [copyMatch.id] });
            setSelectedId(copyMatch.id);
            setSearch(copyMatch.book_copy?.accession_number || copyMatch.book?.title || '');
            setScanFeedback({
                tone: 'success',
                text: `${copyMatch.book_copy?.accession_number ?? 'Copy'} — "${copyMatch.book?.title}" borrowed by ${copyMatch.user?.name ?? 'a student'}.`,
            });
            return;
        }

        // 2. A title label, narrowed to the scanned student's loans when there is one.
        const pool = student ? transactions.filter((t) => t.user_id === student.id) : transactions;
        const titleMatches = prefix === 'LIBTRACK:BOOK:' ? pool.filter((t) => t.book?.qr_code === uuid) : [];
        if (titleMatches.length > 0) {
            const first = titleMatches[0];
            setScan({ payload: `LIBTRACK:BOOK:${uuid}`, loanIds: titleMatches.map((t) => t.id) });
            setSearch(first.book?.title ?? '');

            if (titleMatches.length === 1) {
                setSelectedId(first.id);
                setScanFeedback({
                    tone: 'success',
                    text: `"${first.book?.title}" borrowed by ${first.user?.name ?? 'a student'}` +
                        (first.book_copy?.accession_number ? ` — check the copy in hand is ${first.book_copy.accession_number}.` : '.'),
                });
            } else {
                setSelectedId(null);
                setScanFeedback({
                    tone: 'success',
                    text: `${titleMatches.length} students have "${first.book?.title}" out, and a title label can't tell the copies apart. ` +
                        "Scan the student's QR, or press Return on the borrower's row.",
                });
            }
            return;
        }

        setScan(null);
        setSelectedId(null);
        setScanFeedback({
            tone: 'error',
            text: student
                ? `${student.name} has no active loan for that book.`
                : 'No active loan found for that book. It may already be returned, or belong to another school.',
        });
    };

    const clearStudent = () => {
        setStudent(null);
        setScan(null);
        setSelectedId(null);
        setScanFeedback(null);
    };

    const handleReturn = (transactionId: number) => {
        const tx = transactions.find((t) => t.id === transactionId);
        const scannedThis = Boolean(scan?.loanIds.includes(transactionId));
        const studentVerified = Boolean(student && tx && tx.user_id === student.id);

        // Returning without a scan is still allowed (labels get damaged), but the
        // confirm names the exact copy the librarian should be holding — that is
        // the only check left when the QR isn't read.
        const label = tx?.book_copy?.accession_number;

        // Without a book scan the system cannot prove the right physical book
        // came back, so that path is an explicit, recorded override rather than
        // the default. The server refuses an unscanned return that isn't flagged.
        // A student scan alone proves whose loan it is, not which book.
        const message = scannedThis
            ? `Confirm return of ${label ?? 'this copy'}${studentVerified ? ` by ${student?.name}` : ''}?`
            : `No book QR was scanned.${studentVerified ? ` (Student QR verified: ${student?.name}.)` : ''}\n\n` +
              `Check the book in your hand is ${label ?? 'the borrowed copy'}` +
              ` (borrowed by ${tx?.user?.name ?? 'this student'}).\n\n` +
              'Continuing records this as returned WITHOUT book scan verification.';

        if (!window.confirm(message)) return;

        // Only send a scanned code with the loan it was scanned for — the
        // server rejects a mismatch rather than silently closing the wrong loan.
        const payload: { transaction_id: number; scanned_copy_qr?: string; override_scan?: boolean; scanned_user_qr?: string } = {
            transaction_id: transactionId,
        };
        if (scannedThis && scan) {
            payload.scanned_copy_qr = scan.payload;
        } else {
            payload.override_scan = true;
        }
        if (studentVerified && student) {
            payload.scanned_user_qr = student.payload;
        }

        router.post(route('admin.circulation.process-return'), payload, {
            preserveScroll: true,
            // The student stays selected so their next book can be returned
            // straight away.
            onFinish: () => {
                setScan(null);
                setSelectedId(null);
            },
        });
    };

    return (
        <AdminLayout user={auth.user}>
            <Head title="Return Book" />
            <div className="flex-1 overflow-auto p-6">
                <div className="mb-6">
                    <Link href={route('admin.circulation.index')}>
                        <Button variant="ghost" size="sm"><ArrowLeft size={16} className="mr-2" />Back to Circulation</Button>
                    </Link>
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <CardTitle>Return Book</CardTitle>
                            <div className="flex flex-wrap gap-2">
                                {requestedCount > 0 && (
                                    <Button
                                        variant={onlyRequested ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setOnlyRequested((v) => !v)}
                                    >
                                        <Inbox size={14} className="mr-1" />Return requests ({requestedCount})
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={() => openScanner('student')}>
                                    <UserRound size={14} className="mr-1" />Scan Student QR
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => openScanner('book')}>
                                    <QrCode size={14} className="mr-1" />Scan Book QR
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {flash.error && (
                            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                                {flash.error}
                            </div>
                        )}
                        {flash.success && (
                            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                {flash.success}
                            </div>
                        )}
                        {scanFeedback && (
                            <div className={`mb-4 rounded-md p-3 text-sm ${
                                scanFeedback.tone === 'success'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                                {scanFeedback.text}
                            </div>
                        )}

                        {student && (
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-300">
                                <span className="flex items-center gap-2">
                                    <UserRound size={14} />
                                    Showing books borrowed by <strong>{student.name}</strong>
                                </span>
                                <Button variant="ghost" size="sm" onClick={clearStudent}>
                                    <X size={14} className="mr-1" />Clear
                                </Button>
                            </div>
                        )}

                        <div className="relative mb-4">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Search by title, accession number, or student name..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Book</TableHead>
                                    <TableHead>Copy</TableHead>
                                    <TableHead>Borrower</TableHead>
                                    <TableHead>Borrowed</TableHead>
                                    <TableHead>Due Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                            {student
                                                ? `${student.name} has no more books out.`
                                                : onlyRequested
                                                  ? 'No pending return requests.'
                                                  : 'No active borrowings found.'}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filtered.map((t) => {
                                        const isOverdue = new Date(t.due_date) < new Date();
                                        return (
                                            <TableRow key={t.id} className={selectedId === t.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                                                <TableCell className="font-medium">{t.book?.title || 'N/A'}</TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {t.book_copy?.accession_number ?? (
                                                        <span className="text-amber-600" title="Loan recorded before per-copy tracking">
                                                            untracked
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>{t.user?.name || 'N/A'}</TableCell>
                                                <TableCell>{new Date(t.borrowed_at).toLocaleDateString()}</TableCell>
                                                <TableCell className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                                    {new Date(t.due_date).toLocaleDateString()}
                                                    {isOverdue && ' (Overdue)'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col items-start gap-1">
                                                        <StatusBadge status={t.status} />
                                                        {t.return_requested_at && (
                                                            <span
                                                                className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                                                title={`Requested ${new Date(t.return_requested_at).toLocaleString()}`}
                                                            >
                                                                Student requested return{t.return_request_method === 'qr' ? ' (scanned QR)' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        size="sm"
                                                        variant={scan?.loanIds.includes(t.id) ? 'default' : 'outline'}
                                                        onClick={() => handleReturn(t.id)}
                                                    >
                                                        <RotateCcw size={14} className="mr-1" />
                                                        {scan?.loanIds.includes(t.id) ? 'Return' : 'Return (no scan)'}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <QrScanner
                    isOpen={scannerOpen}
                    onClose={() => setScannerOpen(false)}
                    onScan={handleScan}
                    title={scanTarget === 'student' ? 'Scan Student QR Code' : 'Scan Book QR Code'}
                />
            </div>
        </AdminLayout>
    );
}
