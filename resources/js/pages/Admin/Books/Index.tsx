import FlashMessages from '@/components/FlashMessages';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AdminLayout from '@/layouts/admin-layout';
import { Book, Category, PaginatedResponse, User } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface BooksIndexProps {
    books: PaginatedResponse<Book>;
    categories: Category[];
    filters: {
        search?: string;
        category_id?: string;
        status?: string;
    };
}

const BOOK_STATUSES = ['available', 'borrowed', 'reserved', 'damaged', 'lost'];

export default function BooksIndex({ books, categories, filters }: BooksIndexProps) {
    useLiveRefresh();
    // The controller does not pass a `user` prop; read the authenticated user
    // from Inertia's shared auth. Only librarians may add/edit/delete books.
    const { auth } = usePage().props as { auth?: { user?: User } };
    const currentUser = auth?.user;
    const isLibrarian = currentUser?.user_role === 'librarian';

    const [search, setSearch] = useState(filters.search ?? '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const applyFilters = (newFilters: Record<string, string>) => {
        router.get(
            route('admin.books.index'),
            { search, category_id: filters.category_id ?? '', status: filters.status ?? '', ...newFilters },
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

    const handleStatusChange = (value: string) => {
        applyFilters({ status: value === 'all' ? '' : value });
    };

    const handleDelete = (book: Book) => {
        if (!window.confirm(`Are you sure you want to delete "${book.title}"? This action cannot be undone.`)) return;
        // Only librarians can delete — and a DELETE isn't redirected by the
        // librarian-prefix middleware, so hit the librarian route directly.
        router.delete(route('librarian.books.destroy', book.id));
    };

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    return (
        <AdminLayout user={currentUser}>
            <Head title="Books" />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="flex flex-col gap-6">
                    {/* "Book added / updated / deleted" lands here. */}
                    <FlashMessages />

                    {/* Page header */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Books</h1>
                        {isLibrarian && (
                            <Link href={route('librarian.books.create')}>
                                <Button className="flex items-center gap-2">
                                    <Plus size={16} />
                                    Add Book
                                </Button>
                            </Link>
                        )}
                    </div>

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

                        <Select
                            value={filters.status ?? 'all'}
                            onValueChange={handleStatusChange}
                        >
                            <SelectTrigger className="sm:w-40">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {BOOK_STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Table */}
                    <div className="rounded-xl border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>ISBN</TableHead>
                                    <TableHead>Copies</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {books.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                                            No books found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    books.data.map((book) => (
                                        <TableRow key={book.id}>
                                            <TableCell className="font-medium">{book.title}</TableCell>
                                            <TableCell>{book.author}</TableCell>
                                            <TableCell>{book.category?.name ?? '—'}</TableCell>
                                            <TableCell className="text-gray-500">{book.isbn ?? '—'}</TableCell>
                                            <TableCell>
                                                <span className="font-medium">{book.available_copies}</span>
                                                <span className="text-gray-400">/{book.total_copies}</span>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={book.status} />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link href={route('admin.books.show', book.id)}>
                                                        <Button variant="ghost" size="icon" title="View">
                                                            <Eye size={16} />
                                                        </Button>
                                                    </Link>
                                                    {isLibrarian && (
                                                        <>
                                                            <Link href={route('librarian.books.edit', book.id)}>
                                                                <Button variant="ghost" size="icon" title="Edit">
                                                                    <Pencil size={16} />
                                                                </Button>
                                                            </Link>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Delete"
                                                                className="text-red-500 hover:text-red-700"
                                                                onClick={() => handleDelete(book)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

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
        </AdminLayout>
    );
}
