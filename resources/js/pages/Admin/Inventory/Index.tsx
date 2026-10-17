import StatusBadge from '@/components/StatusBadge';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLiveRefresh } from '@/hooks/use-live-refresh';
import AdminLayout from '@/layouts/admin-layout';
import type { Book, Category, PaginatedResponse } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { BookOpen, Download, Package, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface StatusCounts {
    total: number;
    available: number;
    borrowed: number;
    reserved: number;
    damaged: number;
    lost: number;
}

interface Props {
    books: PaginatedResponse<Book>;
    statusCounts: StatusCounts;
    categories: Category[];
    filters: { search?: string; status?: string; category_id?: string };
}

const BOOK_STATUSES = ['available', 'borrowed', 'reserved', 'damaged', 'lost'];

export default function InventoryIndex({ books, statusCounts, categories, filters }: Props) {
    useLiveRefresh();
    const { auth } = usePage().props as any;
    const [search, setSearch] = useState(filters.search || '');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const applyFilters = (newFilters: Record<string, string>) => {
        router.get(
            route('admin.inventory.index'),
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

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    return (
        <AdminLayout user={auth.user}>
            <Head title="Inventory" />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inventory Monitoring</h1>
                    <a
                        href={route('admin.inventory.export', {
                            search: filters.search || undefined,
                            status: filters.status || undefined,
                            category_id: filters.category_id || undefined,
                        })}
                        download
                    >
                        <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <Download size={16} />
                            Export CSV
                        </Button>
                    </a>
                </div>

                {/* Summary stats */}
                <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    <StatCard title="Total Books" value={statusCounts.total} icon={Package} />
                    <StatCard title="Available" value={statusCounts.available} icon={BookOpen} />
                    <StatCard title="Borrowed" value={statusCounts.borrowed} icon={BookOpen} />
                    <StatCard title="Reserved" value={statusCounts.reserved} icon={BookOpen} />
                    <StatCard title="Damaged" value={statusCounts.damaged} icon={BookOpen} />
                    <StatCard title="Lost" value={statusCounts.lost} icon={BookOpen} />
                </div>

                {/* Filters */}
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative sm:max-w-xs">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Search books..."
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-10"
                        />
                    </div>

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

                {/* Book list */}
                <Card>
                    <CardHeader>
                        <CardTitle>Inventory List</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Author</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Copies</TableHead>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {books.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                            No books found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    books.data.map((book) => (
                                        <TableRow key={book.id}>
                                            <TableCell className="font-medium">{book.title}</TableCell>
                                            <TableCell>{book.author}</TableCell>
                                            <TableCell>{book.category?.name || '-'}</TableCell>
                                            <TableCell>{book.available_copies}/{book.total_copies}</TableCell>
                                            <TableCell>{book.location || '-'}</TableCell>
                                            <TableCell><StatusBadge status={book.status} /></TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {books.last_page > 1 && (
                            <div className="mt-4 flex justify-center gap-1">
                                {books.links.map((link, i) => (
                                    <Button
                                        key={i}
                                        variant={link.active ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </AdminLayout>
    );
}
