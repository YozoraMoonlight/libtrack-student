import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminLayout from '@/layouts/admin-layout';
import type { User } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowRightLeft, Check, GraduationCap, Info, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Fragment, FormEvent, useState } from 'react';

interface SectionRow {
    id: number;
    grade_level: string;
    name: string;
    students_count: number;
}

interface Props {
    sections: SectionRow[];
    gradeLevels: string[];
    hasSchool: boolean;
}

/** Radix needs a non-empty option value; this one means "out of any section". */
const NO_SECTION = '__none__';

export default function SectionsIndex({ sections = [], gradeLevels = [], hasSchool }: Props) {
    const { auth, flash } = usePage().props as any;
    const currentUser: User = auth?.user;
    const prefix = currentUser?.user_role === 'librarian' ? 'librarian' : 'admin';

    // Add form. Kept as its own useForm so a validation error on "add" never
    // paints itself over the row the admin happens to be editing.
    const addForm = useForm({ grade_level: '', name: '' });

    // Which occupied section has its "move students" row open.
    const [movingId, setMovingId] = useState<number | null>(null);
    const [moveTarget, setMoveTarget] = useState<string>(NO_SECTION);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editGrade, setEditGrade] = useState('');
    const [editName, setEditName] = useState('');
    const [editError, setEditError] = useState<string | null>(null);

    const submitAdd = (e: FormEvent) => {
        e.preventDefault();
        addForm.post(route(`${prefix}.sections.store`), {
            preserveScroll: true,
            onSuccess: () => addForm.setData('name', ''),
        });
    };

    const startEdit = (section: SectionRow) => {
        setEditingId(section.id);
        setEditGrade(section.grade_level);
        setEditName(section.name);
        setEditError(null);
    };

    const saveEdit = (section: SectionRow) => {
        router.put(
            route(`${prefix}.sections.update`, section.id),
            { grade_level: editGrade, name: editName },
            {
                preserveScroll: true,
                onSuccess: () => setEditingId(null),
                onError: (errors) => setEditError(errors.name ?? errors.grade_level ?? 'Could not save that section.'),
            },
        );
    };

    // A move reshuffles students between classes of the SAME grade. Promoting a
    // whole class to another grade is not what this button is for, and the
    // server refuses it too.
    const sameGradeTargets = (section: SectionRow) =>
        sections.filter((s) => s.id !== section.id && s.grade_level === section.grade_level);

    const startMove = (section: SectionRow) => {
        setMovingId(section.id);
        setMoveTarget(NO_SECTION);
        setEditingId(null);
    };

    const submitMove = (section: SectionRow) => {
        const target = sections.find((s) => String(s.id) === moveTarget);
        const destination = target ? `${target.grade_level} – ${target.name}` : 'no section';
        if (
            !window.confirm(
                `Move ${section.students_count} student(s) from ${section.grade_level} – ${section.name} to ${destination}?`,
            )
        )
            return;
        router.post(
            route(`${prefix}.sections.move-students`, section.id),
            { target_section_id: target ? target.id : null },
            { preserveScroll: true, onSuccess: () => setMovingId(null) },
        );
    };

    // Occupied sections are blocked server-side too; disabling the button here
    // just saves a round trip that can only come back as an error.
    const remove = (section: SectionRow) => {
        if (section.students_count > 0) return;
        if (!window.confirm(`Delete ${section.grade_level} – ${section.name}?`)) return;
        router.delete(route(`${prefix}.sections.destroy`, section.id), { preserveScroll: true });
    };

    // Rows arrive already ordered Grade 7 → Grade 12; this only decides where to
    // draw the grade heading, so the table reads as one block per grade.
    const isFirstOfGrade = (index: number) => index === 0 || sections[index - 1].grade_level !== sections[index].grade_level;

    return (
        <AdminLayout user={currentUser}>
            <Head title="Sections" />
            <main className="flex-1 overflow-y-auto bg-gray-100 p-4 md:p-6">
                <div className="mx-auto max-w-4xl space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Sections</h1>
                        <p className="text-sm text-gray-500">
                            The classes your school runs, e.g. <span className="font-mono">G7-A</span>,{' '}
                            <span className="font-mono">G7-B</span>, <span className="font-mono">Mabini</span>. These are the
                            choices offered when registering a student and in the roster upload template.
                        </p>
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

                    {!hasSchool ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
                            Your account is not linked to a school, so there are no sections to manage. Ask the Super Admin to
                            assign one.
                        </div>
                    ) : (
                        <>
                            {/* Add */}
                            <form onSubmit={submitAdd} className="rounded-xl border bg-white p-6 shadow-sm">
                                <h2 className="mb-4 text-sm font-semibold text-stone-700">Add a section</h2>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="grade_level">Grade Level</Label>
                                        <Select
                                            value={addForm.data.grade_level}
                                            onValueChange={(v) => addForm.setData('grade_level', v)}
                                        >
                                            <SelectTrigger id="grade_level" className="h-11 rounded-xl">
                                                <SelectValue placeholder="Select grade level" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {gradeLevels.map((g) => (
                                                    <SelectItem key={g} value={g}>
                                                        {g}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {addForm.errors.grade_level && (
                                            <p className="text-xs text-red-600">{addForm.errors.grade_level}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="name">Section Name</Label>
                                        <Input
                                            id="name"
                                            value={addForm.data.name}
                                            onChange={(e) => addForm.setData('name', e.target.value)}
                                            placeholder="e.g. G7-A or Mabini"
                                            maxLength={50}
                                            className="h-11 rounded-xl"
                                        />
                                        {addForm.errors.name && <p className="text-xs text-red-600">{addForm.errors.name}</p>}
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={addForm.processing || !addForm.data.grade_level || !addForm.data.name.trim()}
                                        className="h-11 gap-2 rounded-xl bg-stone-900 hover:bg-stone-800"
                                    >
                                        <Plus size={16} />
                                        Add Section
                                    </Button>
                                </div>
                            </form>

                            {/* List */}
                            <div className="rounded-xl border bg-white shadow-sm">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-40">Grade Level</TableHead>
                                            <TableHead>Section</TableHead>
                                            <TableHead className="w-28">Students</TableHead>
                                            <TableHead className="w-32 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sections.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="py-10 text-center text-sm text-gray-500">
                                                    <GraduationCap className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                                                    No sections yet. Add your first one above — until then, students can be
                                                    registered without a section.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            sections.map((section, index) => (
                                              <Fragment key={section.id}>
                                                <TableRow>
                                                    <TableCell className="text-sm text-stone-600">
                                                        {editingId === section.id ? (
                                                            <Select value={editGrade} onValueChange={setEditGrade}>
                                                                <SelectTrigger className="h-9 rounded-lg">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {gradeLevels.map((g) => (
                                                                        <SelectItem key={g} value={g}>
                                                                            {g}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : isFirstOfGrade(index) ? (
                                                            <span className="font-medium text-stone-900">{section.grade_level}</span>
                                                        ) : (
                                                            <span className="text-stone-300">〃</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {editingId === section.id ? (
                                                            <>
                                                                <Input
                                                                    value={editName}
                                                                    onChange={(e) => setEditName(e.target.value)}
                                                                    maxLength={50}
                                                                    className="h-9 rounded-lg"
                                                                    autoFocus
                                                                />
                                                                {editError && <p className="mt-1 text-xs text-red-600">{editError}</p>}
                                                            </>
                                                        ) : (
                                                            section.name
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-stone-500">
                                                        {section.students_count}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center justify-end gap-1">
                                                            {editingId === section.id ? (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        title="Save"
                                                                        className="text-emerald-600 hover:text-emerald-700"
                                                                        onClick={() => saveEdit(section)}
                                                                    >
                                                                        <Check size={16} />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        title="Cancel"
                                                                        onClick={() => setEditingId(null)}
                                                                    >
                                                                        <X size={16} />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        title="Rename"
                                                                        onClick={() => startEdit(section)}
                                                                    >
                                                                        <Pencil size={16} />
                                                                    </Button>
                                                                    {section.students_count > 0 && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            title="Move students out of this section"
                                                                            onClick={() => startMove(section)}
                                                                        >
                                                                            <ArrowRightLeft size={16} />
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        disabled={section.students_count > 0}
                                                                        title={
                                                                            section.students_count > 0
                                                                                ? `${section.students_count} student(s) are still in this section — move them first`
                                                                                : 'Delete'
                                                                        }
                                                                        className="text-red-500 hover:text-red-700 disabled:text-stone-300"
                                                                        onClick={() => remove(section)}
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {movingId === section.id && (
                                                    <TableRow className="bg-stone-50">
                                                        <TableCell colSpan={4}>
                                                            <div className="flex flex-wrap items-center gap-2 py-1">
                                                                <span className="text-sm text-stone-600">
                                                                    Move all {section.students_count} student(s) to
                                                                </span>
                                                                <Select value={moveTarget} onValueChange={setMoveTarget}>
                                                                    <SelectTrigger className="h-9 w-64 rounded-lg bg-white">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value={NO_SECTION}>No section</SelectItem>
                                                                        {sameGradeTargets(section).map((s) => (
                                                                            <SelectItem key={s.id} value={String(s.id)}>
                                                                                {s.grade_level} – {s.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <Button
                                                                    size="sm"
                                                                    className="h-9 rounded-lg bg-stone-900 hover:bg-stone-800"
                                                                    onClick={() => submitMove(section)}
                                                                >
                                                                    Move
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-9 rounded-lg"
                                                                    onClick={() => setMovingId(null)}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                                <span className="text-xs text-stone-500">
                                                                    {sameGradeTargets(section).length === 0
                                                                        ? `${section.grade_level} has no other section yet — add one above to move these students into it.`
                                                                        : `Students can only move to another ${section.grade_level} section.`}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                              </Fragment>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900">
                                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                <div className="space-y-1">
                                    <p>
                                        Renaming a section moves every student in it to the new name. A section with students
                                        in it can&apos;t be deleted — use the{' '}
                                        <ArrowRightLeft className="inline h-3 w-3" /> button to move them somewhere else first.
                                    </p>
                                    <p>
                                        Sections also show up as a dropdown on{' '}
                                        <Link
                                            href={route(`${prefix}.students.manual-register`)}
                                            className="font-semibold underline"
                                        >
                                            Register Student
                                        </Link>
                                        . A roster upload that names a new section adds it here automatically.
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </AdminLayout>
    );
}
