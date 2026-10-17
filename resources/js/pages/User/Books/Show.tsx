import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import UserLayout from '@/layouts/user-layout';
import { Book, User } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, BookOpen } from 'lucide-react';

interface ShowBookProps {
    user: User;
    book: Book;
    hasActiveBorrow: boolean;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
            <span className="text-sm text-gray-900 dark:text-gray-100">{value ?? '—'}</span>
        </div>
    );
}

export default function ShowBook({ user, book, hasActiveBorrow }: ShowBookProps) {
    useLiveRefresh();
    const flash = (usePage().props as any).flash || {};

    return (
        <UserLayout user={user}>
            <Head title={book.title} />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="mx-auto max-w-4xl flex flex-col gap-6">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <Link href={route('user.books.index')}>
                            <Button variant="outline" size="icon">
                                <ArrowLeft size={16} />
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Book Details</h1>
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

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Main info */}
                        <div className="flex flex-col gap-6 lg:col-span-2">
                            <Card className="dark:border-gray-700 dark:bg-gray-800">
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex flex-col gap-1">
                                            <CardTitle className="text-xl text-gray-900 dark:text-gray-100">
                                                {book.title}
                                            </CardTitle>
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
                                            label="Availability"
                                            value={
                                                <span>
                                                    <span className="font-semibold text-primary">{book.available_copies}</span>
                                                    <span className="text-gray-400"> / {book.total_copies} copies</span>
                                                </span>
                                            }
                                        />
                                    </div>

                                    {book.description && (
                                        <>
                                            <Separator />
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                    Description
                                                </span>
                                                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                                                    {book.description}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar: cover + reserve action */}
                        <div className="flex flex-col gap-6">
                            {/* Cover image */}
                            <Card className="dark:border-gray-700 dark:bg-gray-800">
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

                            {/* Availability info */}
                            <Card className="dark:border-gray-700 dark:bg-gray-800">
                                <CardHeader>
                                    <CardTitle className="text-base text-gray-900 dark:text-gray-100">Availability</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {book.available_copies > 0
                                            ? 'This book is currently available. Visit the library to borrow it.'
                                            : 'All copies are currently borrowed. Please check back later.'}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </UserLayout>
    );
}
