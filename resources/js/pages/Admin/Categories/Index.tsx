import FlashMessages from '@/components/FlashMessages';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminLayout from '@/layouts/admin-layout';
import { Category, User } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

interface CategoriesIndexProps {
    user: User;
    categories: Category[];
}

export default function CategoriesIndex({ user, categories }: CategoriesIndexProps) {
    // Categories are shared by admins and librarians — resolve route names against
    // the current user's prefix so links work under both /admin and /librarian.
    const { auth } = usePage().props as { auth?: { user?: User } };
    const rp = auth?.user?.user_role === 'librarian' ? 'librarian' : 'admin';

    const handleDelete = (category: Category) => {
        if (
            !window.confirm(
                `Are you sure you want to delete "${category.name}"? This may affect books assigned to this category.`,
            )
        )
            return;
        router.delete(route(`${rp}.categories.destroy`, category.id));
    };

    return (
        <AdminLayout user={user}>
            <Head title="Categories" />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="flex flex-col gap-6">
                    {/* "Category created / updated / deleted" lands here. */}
                    <FlashMessages />

                    {/* Page header */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Categories</h1>
                        <Link href={route(`${rp}.categories.create`)}>
                            <Button className="flex items-center gap-2">
                                <Plus size={16} />
                                Add Category
                            </Button>
                        </Link>
                    </div>

                    {/* Table */}
                    <div className="rounded-xl border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Books</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categories.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                                            No categories found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    categories.map((category) => (
                                        <TableRow key={category.id}>
                                            <TableCell className="font-medium">{category.name}</TableCell>
                                            <TableCell className="max-w-xs truncate text-gray-500">
                                                {category.description ?? '—'}
                                            </TableCell>
                                            <TableCell>{category.books_count ?? 0}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link href={route(`${rp}.categories.edit`, category.id)}>
                                                        <Button variant="ghost" size="icon" title="Edit">
                                                            <Pencil size={16} />
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Delete"
                                                        className="text-red-500 hover:text-red-700"
                                                        onClick={() => handleDelete(category)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </main>
        </AdminLayout>
    );
}
