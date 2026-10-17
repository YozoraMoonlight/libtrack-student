import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminLayout from '@/layouts/admin-layout';
import { User } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Copy, Download, FileSpreadsheet, FileUp, KeyRound, Loader2 } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface Credential {
    row: number;
    name: string;
    lrn: string | null;
    grade_level: string | null;
    section: string | null;
    email: string;
    password: string;
    generated_email: boolean;
}

interface ImportResult {
    imported: number;
    skipped: number;
    registered?: number;
    errors: { row: number; lrn?: string; reason: string }[];
    credentials?: Credential[];
}

interface SectionOption {
    id: number;
    grade_level: string;
    name: string;
}

interface Props {
    gradeLevels: string[];
    sections: SectionOption[];
    placeholderDomain: string;
}

export default function StudentsImport({ gradeLevels = [], sections = [], placeholderDomain }: Props) {
    const { auth, flash } = usePage().props as any;
    const currentUser: User = auth?.user;
    const prefix = currentUser?.user_role === 'librarian' ? 'librarian' : 'admin';

    const importResult: ImportResult | null = (flash?.import_result as ImportResult) ?? null;

    const { data, setData, post, processing, errors, progress, reset } = useForm<{
        file: File | null;
        default_grade: string;
        override_grade: boolean;
        create_accounts: boolean;
    }>({
        file: null,
        default_grade: '',
        override_grade: false,
        create_accounts: true,
    });

    const [filename, setFilename] = useState<string | null>(null);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        setData('file', f);
        setFilename(f?.name ?? null);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        post(route(`${prefix}.students.import.store`), {
            forceFormData: true,
            onSuccess: () => {
                reset('file');
                setFilename(null);
            },
        });
    };

    const sampleCsv =
        'lrn,first_name,middle_name,last_name,birthdate,grade_level,section,enrollment_status,email\n' +
        '123456789012,Juan,Santos,Cruz,2011-04-12,Grade 7,Mabini,enrolled,\n' +
        '123456789013,Pedro,,Reyes,2010-09-30,Grade 8,Rizal,enrolled,pedro.reyes@gmail.com\n' +
        ',Maria,Dela,Cruz,2009-01-05,Grade 9,Bonifacio,enrolled,\n';

    const downloadSample = () => {
        const blob = new Blob([sampleCsv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lrn_registry_sample.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    /** Hand-off sheet: what each new student types to sign in. */
    const downloadCredentials = () => {
        const rows = importResult?.credentials ?? [];
        if (!rows.length) return;
        const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const csv =
            'name,lrn,grade_level,section,login_email,password\n' +
            rows
                .map((c) =>
                    [c.name, c.lrn ?? '', c.grade_level ?? '', c.section ?? '', c.email, c.password].map(esc).join(','),
                )
                .join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'student_logins.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const copyCredentials = () => {
        const rows = importResult?.credentials ?? [];
        const text = rows.map((c) => `${c.name}\t${c.lrn ?? '—'}\t${c.email}\t${c.password}`).join('\n');
        navigator.clipboard?.writeText(text);
    };

    return (
        <AdminLayout user={currentUser}>
            <Head title="Batch Upload Students" />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6">
                <div className="mx-auto max-w-3xl space-y-6">
                    <Link
                        href={route(`${prefix}.students.index`)}
                        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800"
                    >
                        <ArrowLeft size={14} />
                        Back to Students
                    </Link>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Batch Upload Students</h1>
                            <p className="text-sm text-stone-500">
                                Upload a roster (<span className="font-mono">.xlsx</span> or{' '}
                                <span className="font-mono">.csv</span>). Students are added to your school&apos;s registry
                                and, by default, registered with a login straight away.
                            </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                            {/* Plain anchor, not an Inertia Link: this is a file
                                download, not a page visit. */}
                            <a href={route(`${prefix}.students.import.template`)} download>
                                <Button type="button" className="gap-2 bg-stone-900 hover:bg-stone-800">
                                    <FileSpreadsheet size={16} />
                                    Excel template
                                </Button>
                            </a>
                            <Button variant="outline" onClick={downloadSample} className="gap-2">
                                <Download size={16} />
                                CSV sample
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-white p-6 shadow-sm">
                        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                            <p className="font-semibold">Start from the Excel template.</p>
                            <p className="mt-1 text-xs">
                                In the template, <span className="font-mono font-semibold">grade_level</span>,{' '}
                                <span className="font-mono font-semibold">section</span> and{' '}
                                <span className="font-mono font-semibold">enrollment_status</span> are{' '}
                                <span className="font-semibold">dropdowns</span> — pick a value instead of typing one, and the
                                import can&apos;t reject the row for a spelling it doesn&apos;t recognise. The{' '}
                                <span className="font-mono font-semibold">lrn</span> column is preset to Text, so 12-digit
                                LRNs stay intact. Fill in the <span className="font-semibold">Students</span> sheet and upload
                                the file as-is.
                            </p>
                            <p className="mt-2 text-xs">
                                The section dropdown lists{' '}
                                {sections.length > 0 ? (
                                    <>
                                        the <span className="font-semibold">{sections.length}</span> section(s) your school has
                                        set up
                                    </>
                                ) : (
                                    <>
                                        your school&apos;s sections — you have none yet, so add them on the{' '}
                                        <Link href={route(`${prefix}.sections.index`)} className="font-semibold underline">
                                            Sections
                                        </Link>{' '}
                                        page first
                                    </>
                                )}
                                . A roster that names a new section adds it there automatically.
                            </p>
                        </div>

                        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            <p className="font-semibold">Columns (same for .xlsx and .csv):</p>
                            <p className="mt-1 font-mono text-xs">
                                Required: <span className="font-bold">first_name</span>,{' '}
                                <span className="font-bold">last_name</span>,{' '}
                                <span className="font-bold">birthdate</span> (when registering accounts)
                            </p>
                            <p className="font-mono text-xs">
                                Optional: <span className="font-bold">lrn</span>, middle_name, grade_level, section,
                                enrollment_status, email
                            </p>
                            <p className="mt-2 text-xs">
                                <span className="font-semibold">grade_level</span> must be one of{' '}
                                <span className="font-mono font-semibold">{gradeLevels.join(' / ')}</span> — anything else is
                                reported as an error instead of being imported. Leave the cell blank and pick a Grade Level
                                below to fill it in.
                            </p>
                            <p className="mt-2 text-xs">
                                <span className="font-semibold">birthdate</span> uses{' '}
                                <span className="font-mono">YYYY-MM-DD</span>. It becomes the student&apos;s password:{' '}
                                <span className="font-mono font-semibold">Surname + birth year</span> (e.g.{' '}
                                <span className="font-mono">Montenegro2005</span>).
                            </p>
                            <p className="mt-2 text-xs">
                                Leave <span className="font-mono font-semibold">email</span> blank and one is generated
                                (<span className="font-mono">&lt;lrn&gt;@{placeholderDomain}</span>). Students can sign in
                                with their <span className="font-semibold">LRN</span> instead, so they never have to type it.
                            </p>
                            <p className="mt-2 text-xs">
                                <span className="font-semibold">Using your own CSV?</span> Upload it as-is — no need to
                                re-save as &quot;CSV UTF-8&quot; — but set the{' '}
                                <span className="font-mono font-semibold">lrn</span> column to{' '}
                                <span className="font-semibold">Text</span> in Excel first, or 12-digit LRNs become{' '}
                                <span className="font-mono">1.23E+11</span> and the rows are rejected. The .xlsx template
                                does this for you.
                            </p>
                        </div>

                        <form onSubmit={submit} className="space-y-4">
                            {/* Grade level picker — the roster is usually one grade,
                                so this fills blanks (or overrides the whole file). */}
                            <div className="grid grid-cols-1 gap-4 rounded-xl border bg-stone-50 p-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label htmlFor="default_grade">Grade Level</Label>
                                    <Select
                                        value={data.default_grade}
                                        onValueChange={(v) => setData('default_grade', v)}
                                    >
                                        <SelectTrigger id="default_grade" className="h-11 rounded-xl bg-white">
                                            <SelectValue placeholder="Use the grade_level column" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {gradeLevels.map((g) => (
                                                <SelectItem key={g} value={g}>
                                                    {g}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.default_grade && <p className="text-xs text-red-600">{errors.default_grade}</p>}
                                    <p className="text-xs text-stone-500">
                                        Applied to rows whose <span className="font-mono">grade_level</span> cell is blank.
                                    </p>
                                </div>

                                <div className="space-y-3 sm:pt-7">
                                    <label className="flex items-start gap-2 text-sm">
                                        <Checkbox
                                            checked={data.override_grade}
                                            onCheckedChange={(v) => setData('override_grade', v === true)}
                                            disabled={!data.default_grade}
                                        />
                                        <span>
                                            Apply to <span className="font-semibold">all rows</span>
                                            <span className="block text-xs text-stone-500">
                                                Ignores the grade_level column entirely.
                                            </span>
                                        </span>
                                    </label>

                                    <label className="flex items-start gap-2 text-sm">
                                        <Checkbox
                                            checked={data.create_accounts}
                                            onCheckedChange={(v) => setData('create_accounts', v === true)}
                                        />
                                        <span>
                                            Register accounts directly
                                            <span className="block text-xs text-stone-500">
                                                Creates a login per student. Needs a birthdate on every row.
                                            </span>
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <label className="block">
                                <input
                                    type="file"
                                    accept=".csv,.txt,.xlsx"
                                    onChange={handleFile}
                                    className="hidden"
                                    id="file-input"
                                />
                                <span className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 px-6 py-10 transition-colors hover:bg-stone-100">
                                    <FileUp className="mb-2 h-8 w-8 text-stone-400" />
                                    <span className="text-sm font-medium text-stone-700">
                                        {filename ?? 'Choose .xlsx or .csv file'}
                                    </span>
                                    <span className="mt-1 text-xs text-stone-500">or drag &amp; drop</span>
                                </span>
                            </label>
                            {errors.file && <p className="text-sm text-red-600">{errors.file}</p>}

                            {progress && (
                                <div className="rounded-md bg-stone-100 p-2 text-xs text-stone-700">
                                    Uploading: {progress.percentage}%
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={processing || !filename}
                                className="h-11 w-full rounded-xl bg-stone-900 hover:bg-stone-800"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Importing…
                                    </>
                                ) : data.create_accounts ? (
                                    'Upload & Register Students'
                                ) : (
                                    'Upload & Add to Registry'
                                )}
                            </Button>
                        </form>
                    </div>

                    {flash?.success && (
                        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                            {flash.error}
                        </div>
                    )}

                    {/* Generated logins. Shown once, right after the import —
                        this is the admin's only chance to copy them out. */}
                    {importResult?.credentials && importResult.credentials.length > 0 && (
                        <div className="rounded-xl border bg-white p-4 shadow-sm">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <h3 className="flex items-center gap-2 font-semibold">
                                    <KeyRound size={16} />
                                    Student logins ({importResult.credentials.length})
                                </h3>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={copyCredentials} className="gap-2">
                                        <Copy size={14} />
                                        Copy
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={downloadCredentials} className="gap-2">
                                        <Download size={14} />
                                        Download CSV
                                    </Button>
                                </div>
                            </div>
                            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                Save this list now — it is shown only after the import. Each password is the student&apos;s
                                surname + birth year. Students can sign in with their LRN or the email below.
                            </p>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>LRN</TableHead>
                                            <TableHead>Login email</TableHead>
                                            <TableHead>Password</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {importResult.credentials.map((c) => (
                                            <TableRow key={`${c.row}-${c.email}`}>
                                                <TableCell className="text-sm">{c.name}</TableCell>
                                                <TableCell className="font-mono text-xs">{c.lrn ?? '—'}</TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {c.email}
                                                    {c.generated_email && (
                                                        <span className="ml-1 rounded bg-stone-100 px-1 text-[10px] text-stone-500">
                                                            auto
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs font-semibold">{c.password}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    {importResult && (importResult.imported > 0 || importResult.skipped > 0) && (
                        <div className="rounded-xl border bg-white p-4 shadow-sm">
                            <h3 className="mb-3 font-semibold">Import Result</h3>
                            <div className="mb-3 flex flex-wrap gap-4 text-sm">
                                <span className="rounded-md bg-emerald-50 px-3 py-1 text-emerald-700">
                                    ✓ Added to registry: {importResult.imported}
                                </span>
                                {typeof importResult.registered === 'number' && (
                                    <span className="rounded-md bg-sky-50 px-3 py-1 text-sky-700">
                                        ✓ Accounts registered: {importResult.registered}
                                    </span>
                                )}
                                <span className="rounded-md bg-orange-50 px-3 py-1 text-orange-700">
                                    ⚠ Skipped: {importResult.skipped}
                                </span>
                            </div>
                            {importResult.errors.length > 0 && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-16">Row</TableHead>
                                            <TableHead>LRN</TableHead>
                                            <TableHead>Reason</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {importResult.errors.map((err, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{err.row}</TableCell>
                                                <TableCell className="font-mono text-xs">{err.lrn ?? '—'}</TableCell>
                                                <TableCell className="text-sm text-red-600">{err.reason}</TableCell>
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
