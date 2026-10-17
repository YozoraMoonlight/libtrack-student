import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminLayout from '@/layouts/admin-layout';
import { Book, Category, SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';

interface SchoolOption {
    id: number;
    name: string;
    code: string;
}

interface EditBookProps {
    book: Book;
    categories: Category[];
    schools: SchoolOption[];
}

export default function EditBook({ book, categories, schools }: EditBookProps) {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;
    const role = user?.user_role;
    const picksSchool = role === 'super_admin' || role === 'admin';
    const isLibrarian = role === 'librarian';
    const showRoute = isLibrarian ? 'librarian.books.show' : 'admin.books.show';
    const updateRoute = isLibrarian ? 'librarian.books.update' : 'admin.books.update';

    const { data, setData, processing, errors } = useForm<{
        title: string;
        author: string;
        isbn: string;
        publisher: string;
        publication_year: string;
        category_id: string;
        school_id: string;
        description: string;
        cover_image: File | null;
        total_copies: string;
        location: string;
    }>({
        title: book.title,
        author: book.author,
        isbn: book.isbn ?? '',
        publisher: book.publisher ?? '',
        publication_year: book.publication_year ? String(book.publication_year) : '',
        category_id: book.category_id ? String(book.category_id) : '',
        school_id: book.school_id ? String(book.school_id) : '',
        description: book.description ?? '',
        cover_image: null,
        total_copies: String(book.total_copies),
        location: book.location ?? '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(
            route(updateRoute, book.id),
            { _method: 'put', ...data },
            { forceFormData: true },
        );
    };

    return (
        <AdminLayout user={user}>
            <Head title={`Edit: ${book.title}`} />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6 dark:bg-gray-900">
                <div className="mx-auto max-w-3xl flex flex-col gap-6">
                    {/* Page header */}
                    <div className="flex items-center gap-4">
                        <Link href={route(showRoute, book.id)}>
                            <Button variant="outline" size="sm">Back</Button>
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit Book</h1>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Book Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                                {/* Row 1: Title + Author */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="title"
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            placeholder="Book title"
                                            aria-invalid={!!errors.title}
                                        />
                                        {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="author">Author <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="author"
                                            value={data.author}
                                            onChange={(e) => setData('author', e.target.value)}
                                            placeholder="Author name"
                                            aria-invalid={!!errors.author}
                                        />
                                        {errors.author && <p className="text-xs text-red-500">{errors.author}</p>}
                                    </div>
                                </div>

                                {/* Row 2: ISBN + Publisher */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="isbn">ISBN</Label>
                                        <Input
                                            id="isbn"
                                            value={data.isbn}
                                            onChange={(e) => setData('isbn', e.target.value)}
                                            placeholder="e.g. 978-3-16-148410-0"
                                            aria-invalid={!!errors.isbn}
                                        />
                                        {errors.isbn && <p className="text-xs text-red-500">{errors.isbn}</p>}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="publisher">Publisher</Label>
                                        <Input
                                            id="publisher"
                                            value={data.publisher}
                                            onChange={(e) => setData('publisher', e.target.value)}
                                            placeholder="Publisher name"
                                            aria-invalid={!!errors.publisher}
                                        />
                                        {errors.publisher && <p className="text-xs text-red-500">{errors.publisher}</p>}
                                    </div>
                                </div>

                                {/* Row 3: Publication Year + Category */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="publication_year">Publication Year</Label>
                                        <Input
                                            id="publication_year"
                                            type="number"
                                            min="1000"
                                            max="9999"
                                            value={data.publication_year}
                                            onChange={(e) => setData('publication_year', e.target.value)}
                                            placeholder="e.g. 2024"
                                            aria-invalid={!!errors.publication_year}
                                        />
                                        {errors.publication_year && <p className="text-xs text-red-500">{errors.publication_year}</p>}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="category_id">Category</Label>
                                        <Select
                                            value={data.category_id}
                                            onValueChange={(val) => setData('category_id', val)}
                                        >
                                            <SelectTrigger id="category_id" aria-invalid={!!errors.category_id}>
                                                <SelectValue placeholder="Select a category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((cat) => (
                                                    <SelectItem key={cat.id} value={String(cat.id)}>
                                                        {cat.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.category_id && <p className="text-xs text-red-500">{errors.category_id}</p>}
                                    </div>
                                </div>

                                {picksSchool && (
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="school_id">School <span className="text-red-500">*</span></Label>
                                        <Select
                                            value={data.school_id}
                                            onValueChange={(val) => setData('school_id', val)}
                                        >
                                            <SelectTrigger id="school_id" aria-invalid={!!errors.school_id}>
                                                <SelectValue placeholder="Select a school" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {schools.map((s) => (
                                                    <SelectItem key={s.id} value={String(s.id)}>
                                                        {s.name} ({s.code})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.school_id && <p className="text-xs text-red-500">{errors.school_id}</p>}
                                    </div>
                                )}

                                {/* Row 4: Total Copies + Location */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="total_copies">Total Copies <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="total_copies"
                                            type="number"
                                            min="1"
                                            value={data.total_copies}
                                            onChange={(e) => setData('total_copies', e.target.value)}
                                            placeholder="1"
                                            aria-invalid={!!errors.total_copies}
                                        />
                                        {errors.total_copies && <p className="text-xs text-red-500">{errors.total_copies}</p>}
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="location">Location</Label>
                                        <Input
                                            id="location"
                                            value={data.location}
                                            onChange={(e) => setData('location', e.target.value)}
                                            placeholder="e.g. Shelf A3"
                                            aria-invalid={!!errors.location}
                                        />
                                        {errors.location && <p className="text-xs text-red-500">{errors.location}</p>}
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="description">Description</Label>
                                    <textarea
                                        id="description"
                                        rows={4}
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="Brief description of the book..."
                                        className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                                        aria-invalid={!!errors.description}
                                    />
                                    {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
                                </div>

                                {/* Cover Image */}
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="cover_image">Cover Image</Label>
                                    {book.cover_image && (
                                        <p className="text-xs text-gray-500">Current image will be kept if no new file is selected.</p>
                                    )}
                                    <Input
                                        id="cover_image"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setData('cover_image', e.target.files?.[0] ?? null)}
                                        aria-invalid={!!errors.cover_image}
                                    />
                                    {errors.cover_image && <p className="text-xs text-red-500">{errors.cover_image}</p>}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-3">
                                    <Link href={route(showRoute, book.id)}>
                                        <Button type="button" variant="outline">Cancel</Button>
                                    </Link>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Saving...' : 'Save Changes'}
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
