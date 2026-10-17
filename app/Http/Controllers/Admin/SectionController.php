<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LrnRegistry;
use App\Models\Section;
use App\Support\GradeLevels;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * School-owned section list (G7-A, G7-B, Mabini, …).
 *
 * Everything here is scoped to the signed-in staff member's school — there is
 * no cross-school view, and no way to touch another school's section even by
 * guessing its id. Super admins have no school of their own, so the page
 * renders an empty state for them rather than a global list.
 */
class SectionController extends Controller
{
    /** Section names are printed on class lists — letters, digits and light punctuation only. */
    private const NAME_REGEX = '/^[A-Za-z0-9][A-Za-z0-9\s\-.,\'&()\/]*$/';

    public function index()
    {
        $this->denyLibrarians();

        $schoolId = Auth::user()->school_id;

        $sections = Section::orderedFor($schoolId);

        // How many registry rows currently sit in each section, so the admin can
        // see what a rename or a delete would touch. Grouped in one query and
        // matched case-insensitively — legacy rows carry whatever case was typed.
        $counts = [];
        if ($schoolId !== null) {
            LrnRegistry::query()
                ->where('school_id', $schoolId)
                ->whereNotNull('section')
                ->where('section', '<>', '')
                ->get(['grade_level', 'section'])
                ->each(function ($row) use (&$counts) {
                    $key = mb_strtolower(trim((string) $row->grade_level) . '|' . trim((string) $row->section));
                    $counts[$key] = ($counts[$key] ?? 0) + 1;
                });
        }

        return Inertia::render('Admin/Sections/Index', [
            'sections' => $sections->map(fn (Section $section) => [
                'id' => $section->id,
                'grade_level' => $section->grade_level,
                'name' => $section->name,
                'students_count' => $counts[mb_strtolower($section->grade_level . '|' . $section->name)] ?? 0,
            ])->all(),
            'gradeLevels' => GradeLevels::all(),
            'hasSchool' => $schoolId !== null,
            'unassignedCount' => $schoolId === null ? 0 : LrnRegistry::where('school_id', $schoolId)
                ->where(fn ($q) => $q->whereNull('section')->orWhere('section', ''))
                ->count(),
        ]);
    }

    public function store(Request $request)
    {
        $this->denyLibrarians();

        $schoolId = Auth::user()->school_id;

        if ($schoolId === null) {
            return back()->with('error', 'Your account is not linked to a school. Ask the Super Admin to assign one before adding sections.');
        }

        $data = $this->validatePayload($request);

        if ($this->duplicateExists($schoolId, $data['grade_level'], $data['name'])) {
            return back()->withErrors([
                'name' => "{$data['grade_level']} already has a section called \"{$data['name']}\".",
            ])->withInput();
        }

        Section::create([
            'school_id' => $schoolId,
            'grade_level' => $data['grade_level'],
            'name' => $data['name'],
        ]);

        return back()->with('success', "Section {$data['grade_level']} – {$data['name']} added.");
    }

    public function update(Request $request, Section $section)
    {
        $this->denyLibrarians();

        $this->authorizeSection($section);

        $data = $this->validatePayload($request);

        if ($this->duplicateExists($section->school_id, $data['grade_level'], $data['name'], $section->id)) {
            return back()->withErrors([
                'name' => "{$data['grade_level']} already has a section called \"{$data['name']}\".",
            ])->withInput();
        }

        $oldGrade = $section->grade_level;
        $oldName = $section->name;
        $renamed = $oldGrade !== $data['grade_level'] || $oldName !== $data['name'];

        DB::transaction(function () use ($section, $data, $oldGrade, $oldName, $renamed) {
            $section->update($data);

            // The registry stores the section as a string, so a rename here has
            // to carry the students with it — otherwise their section stops
            // matching anything in the dropdown and silently reads as orphaned.
            if ($renamed) {
                LrnRegistry::query()
                    ->where('school_id', $section->school_id)
                    ->whereRaw('lower(grade_level) = ?', [mb_strtolower($oldGrade)])
                    ->whereRaw('lower(section) = ?', [mb_strtolower($oldName)])
                    ->update([
                        'grade_level' => $data['grade_level'],
                        'section' => $data['name'],
                    ]);
            }
        });

        return back()->with('success', "Section updated to {$data['grade_level']} – {$data['name']}.");
    }

    /**
     * Move every student currently in this section into another one (or out of
     * any section).
     *
     * This is what makes the delete guard actionable: without it, "move them
     * first" would be an instruction with nowhere to carry it out. The target
     * must be in the SAME grade: this reshuffles a class, it doesn't promote
     * it, so a Grade 9 section can only hand its students to another Grade 9
     * section (or out of any section).
     */
    public function moveStudents(Request $request, Section $section)
    {
        $this->denyLibrarians();

        $this->authorizeSection($section);

        $request->validate([
            // Absent / null means "take them out of any section".
            'target_section_id' => ['nullable', 'integer'],
        ]);

        $target = null;
        if ($request->filled('target_section_id')) {
            $target = Section::where('school_id', $section->school_id)
                ->find($request->integer('target_section_id'));

            if (!$target) {
                return back()->with('error', 'That section is not one of yours.');
            }
            if ($target->id === $section->id) {
                return back()->with('error', 'Pick a different section to move the students into.');
            }
            if (mb_strtolower($target->grade_level) !== mb_strtolower($section->grade_level)) {
                return back()->with(
                    'error',
                    "Students in {$section->grade_level} – {$section->name} can only be moved to another {$section->grade_level} section."
                );
            }
        }

        $moved = LrnRegistry::query()
            ->where('school_id', $section->school_id)
            ->whereRaw('lower(grade_level) = ?', [mb_strtolower($section->grade_level)])
            ->whereRaw('lower(section) = ?', [mb_strtolower($section->name)])
            ->update($target
                ? ['grade_level' => $target->grade_level, 'section' => $target->name]
                : ['section' => null]);

        if ($moved === 0) {
            return back()->with('error', "{$section->grade_level} – {$section->name} has no students to move.");
        }

        $destination = $target ? "{$target->grade_level} – {$target->name}" : 'no section';

        return back()->with('success', "Moved {$moved} student(s) from {$section->grade_level} – {$section->name} to {$destination}.");
    }

    public function destroy(Section $section)
    {
        $this->denyLibrarians();

        $this->authorizeSection($section);

        $assigned = $this->assignedStudentCount($section);

        if ($assigned > 0) {
            return back()->with(
                'error',
                "Cannot delete {$section->grade_level} – {$section->name}: {$assigned} student(s) are still in it. Move them to another section first."
            );
        }

        $label = $section->grade_level . ' – ' . $section->name;
        $section->delete();

        return back()->with('success', "Section {$label} deleted.");
    }

    /**
     * Section management is school-admin work. Librarians have no Sections page
     * (the route is not even registered under their prefix), but only GETs are
     * redirected off /admin/*, so the writes need their own gate.
     */
    private function denyLibrarians(): void
    {
        if (Auth::user()?->isLibrarian()) {
            abort(403, 'Sections are managed by your school admin.');
        }
    }

    /** @return array{grade_level: string, name: string} */
    private function validatePayload(Request $request): array
    {
        $validated = $request->validate([
            'grade_level' => ['required', Rule::in(GradeLevels::all())],
            'name' => ['required', 'string', 'max:50', 'regex:' . self::NAME_REGEX],
        ], [
            'grade_level.required' => 'Pick the grade level this section belongs to.',
            'grade_level.in' => 'Grade level must be one of: ' . GradeLevels::options() . '.',
            'name.required' => 'Give the section a name, e.g. G7-A or Mabini.',
            'name.regex' => 'Section name may only contain letters, numbers, spaces and - . , \' & ( ) /',
        ]);

        return [
            'grade_level' => $validated['grade_level'],
            'name' => trim($validated['name']),
        ];
    }

    /** Case-insensitive: "G7-A" and "g7-a" are the same section, not two. */
    private function duplicateExists(int $schoolId, string $gradeLevel, string $name, ?int $ignoreId = null): bool
    {
        return Section::query()
            ->where('school_id', $schoolId)
            ->where('grade_level', $gradeLevel)
            ->whereRaw('lower(name) = ?', [mb_strtolower($name)])
            ->when($ignoreId, fn ($q) => $q->where('id', '<>', $ignoreId))
            ->exists();
    }

    private function assignedStudentCount(Section $section): int
    {
        return LrnRegistry::query()
            ->where('school_id', $section->school_id)
            ->whereRaw('lower(grade_level) = ?', [mb_strtolower($section->grade_level)])
            ->whereRaw('lower(section) = ?', [mb_strtolower($section->name)])
            ->count();
    }

    private function authorizeSection(Section $section): void
    {
        $schoolId = Auth::user()->school_id;

        if ($schoolId === null || $section->school_id !== $schoolId) {
            abort(403, 'This section belongs to another school.');
        }
    }
}
