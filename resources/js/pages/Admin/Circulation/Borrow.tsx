import QrScanner from '@/components/QrScanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AdminLayout from '@/layouts/admin-layout';
import type { Book, BookCopy, User } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useForm } from '@inertiajs/react';
import { ArrowLeft, QrCode } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type BorrowableBook = Pick<Book, 'id' | 'title' | 'author' | 'isbn' | 'available_copies' | 'qr_code'> & {
    /** Copies currently on the shelf, lowest copy_number first. */
    available_copies_list?: BookCopy[];
};

interface Props {
    users: Pick<User, 'id' | 'name' | 'email' | 'student_id' | 'qr_code'>[];
    books: BorrowableBook[];
    borrowDuration: number;
}

export default function BorrowPage({ users, books, borrowDuration }: Props) {
    useLiveRefresh();
    const { auth } = usePage().props as any;
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scanTarget, setScanTarget] = useState<'book' | 'user'>('book');
    const [scanFeedback, setScanFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
    const flash = (usePage().props as any).flash || {};

    const today = new Date().toISOString().split('T')[0];
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + borrowDuration);
    const defaultDueStr = defaultDue.toISOString().split('T')[0];

    const { data, setData, post, processing, errors } = useForm({
        user_id: '',
        book_id: '',
        // Which physical copy leaves the shelf. Blank = let the server assign
        // the lowest-numbered free copy.
        book_copy_id: '',
        borrowed_at: today,
        due_date: defaultDueStr,
    });

    const copiesOf = (book?: BorrowableBook): BookCopy[] => book?.available_copies_list ?? [];

    // The shelf list refreshes live, so the book or copy picked here can be
    // lent out from another desk before this form is submitted. Drop the stale
    // choice and say why, rather than let the server refuse it.
    useEffect(() => {
        if (!data.book_id) return;
        const book = books.find((b) => String(b.id) === data.book_id);
        if (!book) {
            setData((d) => ({ ...d, book_id: '', book_copy_id: '' }));
            setScanFeedback({
                tone: 'error',
                text: 'The book you picked is no longer on the shelf — its last copy was just lent out. Pick another book.',
            });
            return;
        }
        if (data.book_copy_id && !copiesOf(book).some((c) => String(c.id) === data.book_copy_id)) {
            setData('book_copy_id', '');
            setScanFeedback({ tone: 'error', text: 'The copy you picked was just lent out. Pick or scan another copy.' });
        }
    }, [books]);

    const handleScan = (qrData: string) => {
        const cleaned = qrData.trim();
        console.log('[Borrow] QR scanned:', cleaned);

        if (cleaned.startsWith('LIBTRACK:USER:')) {
            const uuid = cleaned.replace('LIBTRACK:USER:', '').trim();
            const user = users.find((u) => u.qr_code === uuid);
            if (user) {
                setData('user_id', String(user.id));
                setScanFeedback({ tone: 'success', text: `Student matched: ${user.name}` });
            } else {
                setScanFeedback({ tone: 'error', text: 'Student QR did not match any active student in your school. Verify the student is registered, active, and belongs to your school.' });
            }
        } else if (cleaned.startsWith('LIBTRACK:COPY:') || cleaned.startsWith('LIBTRACK:BOOK:')) {
            // A copy QR identifies the exact physical book, so it selects both
            // the title and the copy in one scan. Legacy BOOK: labels resolve
            // to copy #1, which inherited the title's original code.
            const uuid = cleaned.slice('LIBTRACK:COPY:'.length).trim();

            const hit = books
                .flatMap((b) => copiesOf(b).map((c) => ({ book: b, copy: c })))
                .find(({ copy }) => copy.qr_code === uuid);

            // A title label (the book page, or the student's Browse Books QR)
            // names the title but not which copy — only books that predate
            // per-copy codes have a copy carrying it.
            const titleHit = hit || !cleaned.startsWith('LIBTRACK:BOOK:') ? undefined : books.find((b) => b.qr_code === uuid);

            if (hit) {
                setData((d) => ({ ...d, book_id: String(hit.book.id), book_copy_id: String(hit.copy.id) }));
                setScanFeedback({
                    tone: 'success',
                    text: `Copy matched: ${hit.copy.accession_number ?? `Copy #${hit.copy.copy_number}`} — ${hit.book.title}`,
                });
            } else if (titleHit) {
                const shelf = copiesOf(titleHit);
                // With one copy on the shelf there is nothing to choose; with
                // several the librarian picks the one actually handed over.
                const only = shelf.length === 1 ? shelf[0] : null;
                setData((d) => ({ ...d, book_id: String(titleHit.id), book_copy_id: only ? String(only.id) : '' }));
                setScanFeedback({
                    tone: 'success',
                    text: only
                        ? `Book matched: ${titleHit.title} — lending ${only.accession_number ?? `copy #${only.copy_number}`}, its only copy on the shelf.`
                        : `Book matched: ${titleHit.title}. ${shelf.length} copies on the shelf — pick the one you are handing over below, or scan that copy's own label.`,
                });
            } else if (cleaned.startsWith('LIBTRACK:BOOK:')) {
                setScanFeedback({
                    tone: 'error',
                    text: 'No copy of that book is on the shelf to lend. Every copy may already be borrowed or flagged damaged/lost, or the book belongs to another school.',
                });
            } else {
                setScanFeedback({
                    tone: 'error',
                    text: 'That copy is not available to lend. It may already be out, flagged damaged/lost, or belong to another school.',
                });
            }
        } else {
            setScanFeedback({ tone: 'error', text: `Unrecognized QR code: "${cleaned.substring(0, 40)}${cleaned.length > 40 ? '…' : ''}". Expected a LIBTRACK book or student QR.` });
        }
    };

    const openScanner = (target: 'book' | 'user') => {
        setScanTarget(target);
        setScannerOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.circulation.process-borrow'));
    };

    const selectedBook = books.find((b) => String(b.id) === data.book_id);
    const selectedCopies = copiesOf(selectedBook);
    const selectedCopy = selectedCopies.find((c) => String(c.id) === data.book_copy_id);
    const selectedUser = users.find((u) => String(u.id) === data.user_id);

    const daysBetween = useMemo(() => {
        if (!data.borrowed_at || !data.due_date) return null;
        const start = new Date(data.borrowed_at);
        const end = new Date(data.due_date);
        return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }, [data.borrowed_at, data.due_date]);

    return (
        <AdminLayout user={auth.user}>
            <Head title="Borrow Book" />
            <div className="flex-1 overflow-auto p-6">
                <div className="mb-6">
                    <Link href={route('admin.circulation.index')}>
                        <Button variant="ghost" size="sm"><ArrowLeft size={16} className="mr-2" />Back to Circulation</Button>
                    </Link>
                </div>

                <Card className="mx-auto max-w-2xl">
                    <CardHeader>
                        <CardTitle>Borrow Book</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {flash.error && (
                            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                                {flash.error}
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

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label>Student</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={() => openScanner('user')}>
                                        <QrCode size={14} className="mr-1" />Scan QR
                                    </Button>
                                </div>
                                <Select value={data.user_id} onValueChange={(v) => setData('user_id', v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a student" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users.map((user) => (
                                            <SelectItem key={user.id} value={String(user.id)}>
                                                {user.name} {user.student_id ? `(${user.student_id})` : ''} - {user.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.user_id && <p className="text-sm text-red-500 mt-1">{errors.user_id}</p>}
                                {selectedUser && (
                                    <p className="text-sm text-gray-500 mt-1">Selected: {selectedUser.name}</p>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label>Book</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={() => openScanner('book')}>
                                        <QrCode size={14} className="mr-1" />Scan QR
                                    </Button>
                                </div>
                                <Select
                                    value={data.book_id}
                                    onValueChange={(v) => setData((d) => ({ ...d, book_id: v, book_copy_id: '' }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a book" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {books.map((book) => (
                                            <SelectItem key={book.id} value={String(book.id)}>
                                                {book.title} by {book.author} ({book.available_copies} available)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.book_id && <p className="text-sm text-red-500 mt-1">{errors.book_id}</p>}
                            </div>

                            {/* Which physical copy leaves the shelf. Recorded on
                                the loan so only that copy can close it. */}
                            <div>
                                <Label className="mb-2 block">
                                    Copy <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={data.book_copy_id}
                                    onValueChange={(v) => setData('book_copy_id', v)}
                                    disabled={!selectedBook}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={
                                                selectedBook
                                                    ? 'Select the copy you are handing over'
                                                    : 'Select a book first'
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {selectedCopies.map((copy) => (
                                            <SelectItem key={copy.id} value={String(copy.id)}>
                                                {copy.accession_number ?? `Copy #${copy.copy_number}`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.book_copy_id && <p className="text-sm text-red-500 mt-1">{errors.book_copy_id}</p>}
                                {selectedBook && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        {selectedCopy
                                            ? `Lending ${selectedCopy.accession_number ?? `copy #${selectedCopy.copy_number}`}. Only this copy can close the loan.`
                                            : `${selectedCopies.length} copy/copies on the shelf. Scan the copy's QR, or pick its accession number — it must match the book you hand over.`}
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="borrowed_at">Borrowed Date</Label>
                                    <Input
                                        id="borrowed_at"
                                        type="date"
                                        value={data.borrowed_at}
                                        onChange={(e) => setData('borrowed_at', e.target.value)}
                                        className="mt-1"
                                    />
                                    {errors.borrowed_at && <p className="text-sm text-red-500 mt-1">{errors.borrowed_at}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="due_date">Due Date</Label>
                                    <Input
                                        id="due_date"
                                        type="date"
                                        value={data.due_date}
                                        onChange={(e) => setData('due_date', e.target.value)}
                                        className="mt-1"
                                    />
                                    {errors.due_date && <p className="text-sm text-red-500 mt-1">{errors.due_date}</p>}
                                </div>
                            </div>
                            <div className="rounded-md bg-gray-50 p-4 dark:bg-gray-800">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <strong>Borrow Duration:</strong>{' '}
                                    {daysBetween !== null ? (
                                        <span className={daysBetween < 0 ? 'text-red-500 font-medium' : ''}>
                                            {daysBetween} day(s)
                                        </span>
                                    ) : '—'}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    type="submit"
                                    disabled={processing || !data.user_id || !data.book_id || !data.book_copy_id}
                                    className="flex-1"
                                >
                                    {processing ? 'Processing...' : 'Confirm Borrow'}
                                </Button>
                                <Link href={route('admin.circulation.index')}>
                                    <Button type="button" variant="outline">Cancel</Button>
                                </Link>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <QrScanner
                    isOpen={scannerOpen}
                    onClose={() => setScannerOpen(false)}
                    onScan={handleScan}
                    title={scanTarget === 'book' ? 'Scan Book Copy QR Code' : 'Scan Student QR Code'}
                />
            </div>
        </AdminLayout>
    );
}
