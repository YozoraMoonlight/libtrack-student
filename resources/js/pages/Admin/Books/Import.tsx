import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminLayout from '@/layouts/admin-layout';
import { User } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Download, FileUp, Loader2 } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface ImportResult {
    imported: number;
    skipped: number;
    errors: { row: number; title?: string; reason: string }[];
}

export default function BooksImport() {
    const { auth, flash } = usePage().props as any;
    const currentUser: User = auth?.user;
    const prefix = currentUser?.user_role === 'librarian' ? 'librarian' : 'admin';

    const importResult: ImportResult | null = (flash?.import_result as ImportResult) ?? null;

    const { setData, post, processing, errors, progress, reset } = useForm<{ file: File | null }>({ file: null });
    const [filename, setFilename] = useState<string | null>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        setData('file', f);
        setFilename(f?.name ?? null);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route(`${prefix}.books.import.store`), {
            forceFormData: true,
            onSuccess: () => { reset(); setFilename(null); },
        });
    };

    const sampleCsv = "title,author,isbn,category,total_copies,location\nNoli Me Tangere,Jose Rizal,9789712345678,Philippine Literature,5,Shelf A1\nFlorante at Laura,Francisco Balagtas,,Philippine Literature,3,Shelf A2";
    const downloadSample = () => {
        const blob = new Blob([sampleCsv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'books_sample.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <AdminLayout user={currentUser}>
            <Head title="Batch Upload Books" />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6">
                <div className="mx-auto max-w-3xl space-y-6">
                    <Link href={route(`${prefix}.books.index`)} className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800">
                        <ArrowLeft size={14}/>Back to Books
                    </Link>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Batch Upload Books</h1>
                            <p className="text-sm text-stone-500">Upload a CSV. Categories will be created automatically if they don't exist.</p>
                        </div>
                        <Button variant="outline" onClick={downloadSample} className="gap-2"><Download size={16}/>Download sample</Button>
                    </div>

                    <div className="rounded-xl border bg-white p-6 shadow-sm">
                        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                            <p className="font-semibold">CSV columns required:</p>
                            <p className="font-mono text-xs mt-1">title, author, category, total_copies</p>
                            <p className="text-xs mt-1">Optional: <span className="font-mono">isbn, location</span></p>
                        </div>

                        <form onSubmit={submit} className="space-y-4">
                            <label className="block">
                                <input type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" id="file-input"/>
                                <span className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 px-6 py-10 hover:bg-stone-100">
                                    <FileUp className="h-8 w-8 text-stone-400 mb-2"/>
                                    <span className="text-sm font-medium text-stone-700">{filename ?? 'Choose CSV file'}</span>
                                </span>
                            </label>
                            {errors.file && <p className="text-sm text-red-600">{errors.file}</p>}

                            {progress && (
                                <div className="rounded-md bg-stone-100 p-2 text-xs text-stone-700">Uploading: {progress.percentage}%</div>
                            )}

                            <Button type="submit" disabled={processing || !filename} className="w-full h-11 rounded-xl bg-stone-900 hover:bg-stone-800">
                                {processing ? <><Loader2 className="h-4 w-4 animate-spin mr-2"/>Importing…</> : 'Upload & Import'}
                            </Button>
                        </form>
                    </div>

                    {flash?.success && (
                        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>
                    )}

                    {importResult && (importResult.imported > 0 || importResult.skipped > 0) && (
                        <div className="rounded-xl border bg-white p-4 shadow-sm">
                            <h3 className="mb-3 font-semibold">Import Result</h3>
                            <div className="mb-3 flex gap-4 text-sm">
                                <span className="rounded-md bg-emerald-50 px-3 py-1 text-emerald-700">✓ Imported: {importResult.imported}</span>
                                <span className="rounded-md bg-orange-50 px-3 py-1 text-orange-700">⚠ Skipped: {importResult.skipped}</span>
                            </div>
                            {importResult.errors.length > 0 && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-16">Row</TableHead>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Reason</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {importResult.errors.map((err, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{err.row}</TableCell>
                                                <TableCell className="text-xs">{err.title ?? '—'}</TableCell>
                                                <TableCell className="text-red-600 text-sm">{err.reason}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </AdminLayout>
    );
}
