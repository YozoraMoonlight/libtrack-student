import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/layouts/admin-layout';
import { User } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';

interface CreateCategoryProps {
    user: User;
}

export default function CreateCategory({ user }: CreateCategoryProps) {
    // Resolve route names against the current user's prefix (admin/librarian).
    const { auth } = usePage().props as { auth?: { user?: User } };
    const rp = auth?.user?.user_role === 'librarian' ? 'librarian' : 'admin';

    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route(`${rp}.categories.store`));
    };

    return (
        <AdminLayout user={user}>
            <Head title="Add Category" />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="mx-auto max-w-xl flex flex-col gap-6">
                    {/* Page header */}
                    <div className="flex items-center gap-4">
                        <Link href={route(`${rp}.categories.index`)}>
                            <Button variant="outline" size="sm">Back</Button>
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add Category</h1>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Category Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="Category name"
                                        aria-invalid={!!errors.name}
                                    />
                                    {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="description">Description</Label>
                                    <textarea
                                        id="description"
                                        rows={3}
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="Optional description..."
                                        className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                                        aria-invalid={!!errors.description}
                                    />
                                    {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
                                </div>

                                <div className="flex items-center justify-end gap-3">
                                    <Link href={route(`${rp}.categories.index`)}>
                                        <Button type="button" variant="outline">Cancel</Button>
                                    </Link>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Adding...' : 'Add Category'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </AdminLayout>
    );
}
