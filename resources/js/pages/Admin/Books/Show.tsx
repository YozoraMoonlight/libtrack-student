import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AdminLayout from '@/layouts/admin-layout';
import { Book, BookCopy, Transaction, User } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, BookOpen, Layers, Pencil, Printer, Trash2 } from 'lucide-react';

interface CopyRow extends BookCopy {
    borrower?: string | null;
}

interface ShowBookProps {
    user: User;
    book: Book & { transactions?: Transaction[] };
    qrCode: string;
    copies?: CopyRow[];
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
            <span className="text-sm text-gray-900 dark:text-gray-100">{value ?? '—'}</span>
        </div>
    );
}

export default function ShowBook({ user, book, qrCode, copies = [] }: ShowBookProps) {
    // The title QR never changes while the page is open.
    useLiveRefresh({ except: ['qrCode'] });
    const { auth } = usePage().props as any;
    const prefix = auth?.user?.user_role === 'librarian' ? 'librarian' : 'admin';

    const handleDelete = () => {
        if (!window.confirm(`Are you sure you want to delete "${book.title}"? This action cannot be undone.`)) return;
        router.delete(route(`${prefix}.books.destroy`, book.id));
    };

    return (
        <AdminLayout user={user}>
            <Head title={book.title} />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="mx-auto max-w-4xl flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <Link href={route(`${prefix}.books.index`)}>
                                <Button variant="outline" size="icon">
                                    <ArrowLeft size={16} />
                                </Button>
                            </Link>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Book Details</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <Link href={route(`${prefix}.books.edit`, book.id)}>
                                <Button variant="outline" className="flex items-center gap-2">
                                    <Pencil size={15} />
                                    Edit
                                </Button>
                            </Link>
                            <Button
                                variant="destructive"
                                className="flex items-center gap-2"
                                onClick={handleDelete}
                            >
                                <Trash2 size={15} />
                                Delete
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Main info */}
                        <div className="flex flex-col gap-6 lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex flex-col gap-1">
                                            <CardTitle className="text-xl">{book.title}</CardTitle>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">by {book.author}</p>
                                        </div>
                                        <StatusBadge status={book.status} />
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-4">
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                        <DetailRow label="ISBN" value={book.isbn} />
                                        <DetailRow label="Publisher" value={book.publisher} />
                                        <DetailRow label="Year" value={book.publication_year} />
                                        <DetailRow label="Category" value={book.category?.name} />
                                        <DetailRow label="Location" value={book.location} />
                                        <DetailRow
                                            label="Copies"
                                            value={
                                                <span>
                                                    <span className="font-semibold text-primary">{book.available_copies}</span>
                                                    <span className="text-gray-400"> / {book.total_copies} available</span>
                                                </span>
                                            }
                                        />
                                    </div>

                                    {book.description && (
                                        <>
                                            <Separator />
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Description</span>
                                                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{book.description}</p>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Physical copies — each has its own QR code, which is
                                what binds a loan to one specific book. */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between gap-2">
                                        <CardTitle className="text-base">Physical copies ({copies.length})</CardTitle>
                                        <Link href={route(`${prefix}.books.copies.index`, book.id)}>
                                            <Button variant="outline" size="sm" className="gap-2">
                                                <Printer size={14} />
                                                Copies &amp; labels
                                            </Button>
                                        </Link>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0 pb-2">
                                    {copies.length === 0 ? (
                                        <p className="px-6 pb-4 text-sm text-gray-500">No copies recorded for this book yet.</p>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Accession no.</TableHead>
                                                    <TableHead>Copy</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Held by</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {copies.map((copy) => (
                                                    <TableRow key={copy.id}>
                                                        <TableCell className="font-mono text-xs">
                                                            {copy.accession_number ?? '—'}
                                                        </TableCell>
                                                        <TableCell>#{copy.copy_number}</TableCell>
                                                        <TableCell>
                                                            <StatusBadge status={copy.status} />
                                                        </TableCell>
                                                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                                                            {copy.borrower ?? '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Recent transactions */}
                            {book.transactions && book.transactions.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Recent Transactions</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 pb-2">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Borrower</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Due Date</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {book.transactions.map((tx) => (
                                                    <TableRow key={tx.id}>
                                                        <TableCell>{tx.user?.name ?? `User #${tx.user_id}`}</TableCell>
                                                        <TableCell className="capitalize">{tx.type}</TableCell>
                                                        <TableCell>{new Date(tx.due_date).toLocaleDateString()}</TableCell>
                                                        <TableCell>
                                                            <StatusBadge status={tx.status} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Sidebar: cover + QR */}
                        <div className="flex flex-col gap-6">
                            {/* Cover image */}
                            <Card>
                                <CardContent className="flex items-center justify-center p-4">
                                    {book.cover_image ? (
                                        <img
                                            src={book.cover_image_url ?? undefined}
                                            alt={book.title}
                                            className="max-h-64 w-full rounded-md object-contain"
                                        />
                                    ) : (
                                        <div className="flex h-48 w-full items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700">
                                            <BookOpen size={40} className="text-gray-400" />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* QR code */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Title QR Code</CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col items-center gap-3">
                                    <img
                                        src={qrCode}
                                        alt={`QR code for ${book.title}`}
                                        className="h-40 w-40"
                                    />
                                    <p className="rounded-md bg-amber-50 px-2 py-1.5 text-center text-xs text-amber-800">
                                        Reference only — this identifies the <strong>title</strong>, not a specific book.
                                        Don&apos;t stick it on a shelf copy: circulation scans per-copy labels.
                                    </p>
                                    <Link href={route(`${prefix}.books.copies.index`, book.id)} className="w-full">
                                        <Button size="sm" className="w-full gap-2 bg-stone-900 hover:bg-stone-800">
                                            <Layers size={14} />
                                            Print copy labels
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </AdminLayout>
    );
}
