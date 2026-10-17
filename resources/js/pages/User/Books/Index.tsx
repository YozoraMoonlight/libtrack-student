import StatusBadge from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import UserLayout from '@/layouts/user-layout';
import { Book, Category, PaginatedResponse, User } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { BookOpen, Printer, QrCode } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface BrowseBooksProps {
    user: User;
    books: PaginatedResponse<Book>;
    categories: Category[];
    filters: {
        search?: string;
        category_id?: string;
    };
}

export default function BrowseBooks({ user, books, categories, filters }: BrowseBooksProps) {
    // Copies-available counts follow the desk as books go out and come back.
    useLiveRefresh();
    const flash = (usePage().props as any).flash || {};
    const [search, setSearch] = useState(filters.search ?? '');
    const [qrBook, setQrBook] = useState<Book | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const applyFilters = (newFilters: Record<string, string>) => {
        router.get(
            route('user.books.index'),
            { search, category_id: filters.category_id ?? '', ...newFilters },
            { preserveState: true, replace: true },
        );
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            applyFilters({ search: value });
        }, 300);
    };

    const handleCategoryChange = (value: string) => {
        applyFilters({ category_id: value === 'all' ? '' : value });
    };

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    return (
        <UserLayout user={user}>
            <Head title="Browse Books" />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="flex flex-col gap-6">
                    {/* Page header */}
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Browse Books</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {books.total} book{books.total !== 1 ? 's' : ''} available
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

                    {/* Filters */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Input
                            placeholder="Search by title, author, or ISBN..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="sm:max-w-xs"
                        />
                        <Select
                            value={filters.category_id ?? 'all'}
                            onValueChange={handleCategoryChange}
                        >
                            <SelectTrigger className="sm:w-48">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={String(cat.id)}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Book grid */}
                    {books.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border bg-white py-16 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <BookOpen size={48} className="mb-3 text-gray-300 dark:text-gray-600" />
                            <p className="text-base font-medium text-gray-500 dark:text-gray-400">No books found</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500">Try adjusting your search or filter</p>
                        </div>
                    ) : (
                        <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {books.data.map((book) => (
                                <Card key={book.id} className="h-full transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
                                    <CardContent className="flex gap-4 p-4">
                                        {/* QR thumbnail */}
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); setQrBook(book); }}
                                            title="Show QR Code — scan at the library shelf"
                                            className="group flex-shrink-0 cursor-pointer rounded border border-stone-200 bg-white p-1.5 hover:border-amber-400 hover:shadow"
                                        >
                                            <img
                                                src={route('user.books.qr-code', book.id)}
                                                alt={`QR code for ${book.title}`}
                                                className="h-20 w-20 object-contain"
                                                loading="lazy"
                                            />
                                            <span className="mt-1 flex items-center justify-center gap-1 text-[10px] font-medium text-stone-500 group-hover:text-amber-600">
                                                <QrCode size={10}/>Show QR
                                            </span>
                                        </button>

                                        {/* Details — clickable to detail page */}
                                        <Link href={route('user.books.show', book.id)} className="flex min-w-0 flex-1 flex-col gap-1.5 cursor-pointer">
                                            <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">
                                                {book.title}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{book.author}</p>

                                            {book.category && (
                                                <Badge variant="outline" className="w-fit text-xs">
                                                    {book.category.name}
                                                </Badge>
                                            )}

                                            <div className="mt-auto flex flex-col gap-1">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                                        {book.available_copies}
                                                    </span>
                                                    /{book.total_copies} copies available
                                                </p>
                                                <StatusBadge status={book.status} />
                                            </div>
                                        </Link>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <Dialog open={!!qrBook} onOpenChange={(open) => !open && setQrBook(null)}>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2"><QrCode size={18}/>Book QR Code</DialogTitle>
                                </DialogHeader>
                                {qrBook && (
                                    <div className="space-y-4">
                                        <div className="text-center">
                                            <p className="text-base font-semibold text-stone-900">{qrBook.title}</p>
                                            <p className="text-sm text-stone-500">{qrBook.author}</p>
                                            {qrBook.location && (
                                                <p className="mt-1 text-xs text-amber-600">📍 Location: {qrBook.location}</p>
                                            )}
                                        </div>
                                        <div className="flex justify-center rounded-xl bg-white p-6 ring-1 ring-stone-200">
                                            <img
                                                src={route('user.books.qr-code', qrBook.id)}
                                                alt={`QR code for ${qrBook.title}`}
                                                className="h-64 w-64 object-contain"
                                            />
                                        </div>
                                        <p className="text-center text-xs text-stone-500">
                                            Show this QR to the librarian to borrow this book quickly.
                                        </p>
                                        <Button
                                            onClick={() => window.print()}
                                            variant="outline"
                                            className="w-full gap-2"
                                        >
                                            <Printer size={14}/>Print
                                        </Button>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>
                        </>
                    )}

                    {/* Pagination */}
                    {books.last_page > 1 && (
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                            <span>
                                Showing {books.from ?? 0}–{books.to ?? 0} of {books.total} results
                            </span>
                            <div className="flex gap-1">
                                {books.links.map((link, i) => (
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
            </main>
        </UserLayout>
    );
}
