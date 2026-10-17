<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LrnRegistry;
use App\Models\School;
use App\Models\Section;
use App\Models\User;
use App\Services\AccountCreationOtp;
use App\Services\BatchImportService;
use App\Services\LrnRegistryService;
use App\Services\RegistryAccountLink;
use App\Services\RosterTemplate;
use App\Support\GradeLevels;
use App\Support\PasswordRules;
use App\Support\StudentCredentials;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class StudentController extends Controller
{
    /** Session slot for the student waiting on their SMS code. */
    private const OTP_KEY = 'students';


    public function index(Request $request, RegistryAccountLink $links)
    {
        $currentUser = Auth::user();

        $entries = LrnRegistry::query()
            ->with('school:id,name,code')
            ->when(!$currentUser->isSuperAdmin(), fn ($q) => $q->where('school_id', $currentUser->school_id))
            ->when($currentUser->isSuperAdmin() && $request->school_id, fn ($q) => $q->where('school_id', $request->school_id))
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereRaw('lower(name) like ?', ['%' . strtolower($search) . '%'])
                      ->orWhere('lrn', 'like', '%' . $search . '%');
                });
            })
            ->when($request->status === 'registered', fn ($q) => $q->registered())
            ->when($request->status === 'unregistered', fn ($q) => $q->registered(false))
            ->orderByDesc('created_at')
            ->paginate(10)
            ->withQueryString();

        // Through the row→account link, not the LRN alone: a student registered
        // without an LRN has an account all the same.
        $accounts = $links->accountsFor($entries->getCollection(), [
            'credentialHolds' => fn ($q) => $q->where('status', 'active'),
        ]);

        $entries->getCollection()->transform(function ($entry) use ($accounts) {
            $user = $accounts->get($entry->id);
            return [
                'id' => $entry->id,
                'lrn' => $entry->lrn,
                'name' => $entry->name,
                'grade_level' => $entry->grade_level,
                'section' => $entry->section,
                'enrollment_status' => $entry->enrollment_status,
                'school' => $entry->school,
                'is_registered' => (bool) $user,
                'user' => $user ? [
                    'id' => $user->id,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'is_active' => $user->is_active,
                    'credential_holds' => $user->credentialHolds,
                ] : null,
            ];
        });

        return Inertia::render('Admin/Students/Index', [
            'students' => $entries,
            'schools' => $currentUser->isSuperAdmin()
                ? School::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code'])
                : [],
            'filters' => $request->only(['search', 'status', 'school_id']),
            // Feed the per-student "move to another grade/section" control:
            // promoting one Grade 7 student to Grade 8 is not something the
            // section-wide move on the Sections page can express.
            'gradeLevels' => GradeLevels::all(),
            'sections' => $this->sectionOptions(),
        ]);
    }

    public function manualRegisterForm(AccountCreationOtp $otp)
    {
        return Inertia::render('Admin/Students/ManualRegister', [
            'gradeLevels' => GradeLevels::all(),
            // Section is a dropdown, not free text: the admin picks from the
            // sections their school set up on the Sections page.
            'sections' => $this->sectionOptions(),
            // Set once the form has been submitted and the code is in flight.
            'otpPending' => $otp->props(self::OTP_KEY),
        ]);
    }

    /**
     * The school's sections, shaped for a dropdown.
     *
     * @return array<int, array{id: int, grade_level: string, name: string}>
     */
    private function sectionOptions(): array
    {
        return Section::orderedFor(Auth::user()->school_id)
            ->map(fn (Section $section) => [
                'id' => $section->id,
                'grade_level' => $section->grade_level,
                'name' => $section->name,
            ])
            ->all();
    }

    /**
     * Direct student registration. LRN is optional — students without a DepEd
     * LRN can still be registered. When an LRN is provided we also upsert the
     * matching LRN-registry row so the student appears in the Students index.
     */
    public function manualRegister(Request $request, AccountCreationOtp $otp)
    {
        $currentUser = Auth::user();

        if (!$currentUser->school_id && !$currentUser->isSuperAdmin()) {
            return back()->with('error', 'Your account is not linked to a school. Ask the Super Admin to assign one before registering students.');
        }

        $request->validate([
            'first_name' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z\s\'.\-]+$/'],
            'middle_name' => ['nullable', 'string', 'max:100', 'regex:/^[A-Za-z\s\'.\-]+$/'],
            'last_name' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z\s\'.\-]+$/'],
            // Birthdate drives the default password (surname + birth year), so
            // it is required even though the column itself is nullable.
            'birthdate' => ['required', 'date', 'before:today', 'after:1900-01-01'],
            'lrn' => ['nullable', 'digits:12', 'unique:users,lrn'],
            'email' => 'required|email|unique:users,email',
            'phone' => ['required', 'regex:/^09\d{9}$/'],
            'grade_level' => ['nullable', Rule::in(GradeLevels::all())],
            'section' => ['nullable', 'string', 'max:50'],
            // No confirmation field on the manual-register form — the admin
            // types (or accepts) the password once. Relaxed rules: the default
            // is "Montenegro2005", which has no symbol by design.
            'password' => PasswordRules::studentSet(),
        ], array_merge([
            'first_name.regex' => 'First name may only contain letters, spaces, apostrophes, dots, or hyphens.',
            'middle_name.regex' => 'Middle name may only contain letters, spaces, apostrophes, dots, or hyphens.',
            'last_name.regex' => 'Last name may only contain letters, spaces, apostrophes, dots, or hyphens.',
            'phone.regex' => 'Use the 09XXXXXXXXX format (e.g. 09171234567).',
            'lrn.digits' => 'LRN must be exactly 12 digits.',
            'lrn.unique' => 'This LRN is already registered.',
            'birthdate.required' => 'Birthdate is required — the student\'s password is their surname + birth year.',
            'birthdate.before' => 'Birthdate must be in the past.',
            'grade_level.in' => 'Grade level must be one of: ' . GradeLevels::options() . '.',
        ], PasswordRules::messages()));

        $first = trim($request->first_name);
        $middle = trim((string) $request->middle_name);
        $last = trim($request->last_name);
        $composedName = trim($first . ' ' . ($middle !== '' ? $middle . ' ' : '') . $last);

        $schoolId = $currentUser->school_id;
        $lrnInput = $request->lrn ? trim($request->lrn) : null;
        $birthdate = StudentCredentials::parseBirthdate($request->birthdate);

        // A section has to be one the school actually offers, and it hangs off a
        // grade level — "Mabini" alone doesn't say which class it is. Resolving
        // it here also normalises the casing to whatever the Sections page holds.
        $sectionName = trim((string) $request->section) ?: null;
        if ($sectionName !== null) {
            if (!$request->grade_level) {
                return back()->withErrors(['grade_level' => 'Pick the grade level this section belongs to.'])->withInput();
            }

            $section = Section::where('school_id', $schoolId)
                ->where('grade_level', $request->grade_level)
                ->whereRaw('lower(name) = ?', [mb_strtolower($sectionName)])
                ->first();

            if (!$section) {
                return back()->withErrors([
                    'section' => "\"{$sectionName}\" is not a section of {$request->grade_level}. Pick one from the list, or add it on the Sections page.",
                ])->withInput();
            }

            $sectionName = $section->name;
        }

        // Grade and section are one decision, so they are carried forward as one.
        // Only when the form supplies NEITHER do we keep what the registry already
        // had; supplying a grade means the submitted section (or none) is the
        // student's section now. Mixing the two sources is what would let a
        // Grade 7 section survive a move to Grade 10 and become unreachable.
        $gradeInput = $request->grade_level ?: null;
        $keepExistingPlacement = $gradeInput === null && $sectionName === null;

        if ($birthdate === null) {
            return back()->withErrors(['birthdate' => 'Enter a valid birthdate (YYYY-MM-DD).'])->withInput();
        }

        $payload = [
            'first_name' => $first,
            'middle_name' => $middle !== '' ? $middle : null,
            'last_name' => $last,
            'name' => $composedName,
            'birthdate' => $birthdate->toDateString(),
            'school_id' => $schoolId,
            'lrn' => $lrnInput,
            'email' => $request->email,
            'phone' => $this->normalizePhone($request->phone),
            'grade_level' => $gradeInput,
            'section' => $sectionName,
            'keep_existing_placement' => $keepExistingPlacement,
            'password_hash' => Hash::make($request->password),
        ];

        // Worth catching before a code goes out: an LRN filed under another
        // school is not something a confirmation SMS can fix.
        if ($lrnInput !== null) {
            $existing = LrnRegistry::where('lrn', $lrnInput)->first();
            if ($existing && !$currentUser->isSuperAdmin() && $existing->school_id !== $schoolId) {
                return back()->withErrors(['lrn' => 'This LRN already belongs to another school. Contact the Super Admin to transfer.'])->withInput();
            }
        }

        // Nothing is written until the number on the form answers with the code.
        if ($otp->enabled()) {
            $flash = $otp->start(self::OTP_KEY, $payload['phone'], $payload, $composedName . ' (Student)');

            return redirect()->route($this->staffPrefix() . '.students.manual-register')->with($flash);
        }

        return $this->createStudentFromPayload($payload);
    }

    /** Code came back correct — register the student parked at submit time. */
    public function verifyManualRegisterOtp(Request $request, AccountCreationOtp $otp)
    {
        $request->validate(['code' => 'required|digits:6'], ['code.digits' => 'Enter the 6-digit code.']);

        $result = $otp->confirm(self::OTP_KEY, $request->code);

        if (!$result['ok']) {
            return back()->withErrors(['code' => $result['error']]);
        }

        $payload = $result['payload'];

        // Email and LRN were both free when the form was submitted; either can
        // be taken while the code is in the air.
        if (User::where('email', $payload['email'])->exists()) {
            return redirect()->route($this->staffPrefix() . '.students.manual-register')
                ->withErrors(['email' => 'That email address was taken while the code was being verified. Please fill in the form again.']);
        }

        if ($payload['lrn'] !== null && User::where('lrn', $payload['lrn'])->exists()) {
            return redirect()->route($this->staffPrefix() . '.students.manual-register')
                ->withErrors(['lrn' => 'That LRN was registered while the code was being verified.']);
        }

        return $this->createStudentFromPayload($payload);
    }

    public function resendManualRegisterOtp(AccountCreationOtp $otp)
    {
        $flash = $otp->resend(self::OTP_KEY);

        return redirect()->route($this->staffPrefix() . '.students.manual-register')
            ->with($flash ?? ['error' => 'That request expired. Fill in the form again.']);
    }

    public function cancelManualRegisterOtp(AccountCreationOtp $otp)
    {
        $otp->forget(self::OTP_KEY);

        return redirect()->route($this->staffPrefix() . '.students.manual-register');
    }

    /**
     * Write the student: the registry row that makes them visible on the
     * Students page, plus the account they sign in with.
     *
     * @param  array<string, mixed>  $payload  Already validated, password hashed.
     */
    private function createStudentFromPayload(array $payload)
    {
        $currentUser = Auth::user();
        $schoolId = $payload['school_id'];
        $lrnInput = $payload['lrn'];

        // If the school admin provided an LRN, check the registry for cross-school conflicts
        // and upsert the registry entry so the listing page shows them.
        if ($lrnInput !== null) {
            $existing = LrnRegistry::where('lrn', $lrnInput)->first();
            if ($existing && !$currentUser->isSuperAdmin() && $existing->school_id !== $schoolId) {
                return back()->withErrors(['lrn' => 'This LRN already belongs to another school. Contact the Super Admin to transfer.'])->withInput();
            }
            $registry = LrnRegistry::updateOrCreate(
                ['lrn' => $lrnInput],
                [
                    'name' => $payload['name'],
                    'first_name' => $payload['first_name'],
                    'middle_name' => $payload['middle_name'],
                    'last_name' => $payload['last_name'],
                    'birthdate' => $payload['birthdate'],
                    'school_id' => $schoolId,
                    'grade_level' => $payload['keep_existing_placement'] ? $existing?->grade_level : $payload['grade_level'],
                    'section' => $payload['keep_existing_placement'] ? $existing?->section : $payload['section'],
                    'enrollment_status' => $existing?->enrollment_status ?: 'enrolled',
                ]
            );
        } else {
            // No LRN — still create a registry row so the student is visible on the index page.
            $registry = LrnRegistry::create([
                'lrn' => null,
                'name' => $payload['name'],
                'first_name' => $payload['first_name'],
                'middle_name' => $payload['middle_name'],
                'last_name' => $payload['last_name'],
                'birthdate' => $payload['birthdate'],
                'school_id' => $schoolId,
                'grade_level' => $payload['grade_level'],
                'section' => $payload['section'],
                'enrollment_status' => 'enrolled',
            ]);
        }

        $user = User::create([
            'name' => $payload['name'],
            'first_name' => $payload['first_name'],
            'middle_name' => $payload['middle_name'],
            'last_name' => $payload['last_name'],
            'birthdate' => $payload['birthdate'],
            'email' => $payload['email'],
            'password' => $payload['password_hash'],
            'user_role' => 'user',
            'student_id' => $lrnInput,
            'lrn' => $lrnInput,
            'enrollment_status' => $registry->enrollment_status,
            'phone' => $payload['phone'],
            'school_id' => $schoolId,
            'is_active' => true,
        ]);

        // The link is what the Students page reads. For a student with no LRN it
        // is the ONLY thing tying their row to this account.
        app(RegistryAccountLink::class)->link($registry, $user);

        // Tell the admin what the student actually signs in with — they can log
        // in with either their LRN or the email on the account.
        $loginHint = $lrnInput ? "LRN {$lrnInput} or {$user->email}" : $user->email;

        return redirect()->route($this->staffPrefix() . '.students.index')
            ->with('success', "Student {$user->name} registered successfully. They sign in with {$loginHint}.");
    }

    /** Librarians and admins share these pages under different URL prefixes. */
    private function staffPrefix(): string
    {
        return Auth::user()->isLibrarian() ? 'librarian' : 'admin';
    }

    public function importForm()
    {
        return Inertia::render('Admin/Students/Import', [
            'gradeLevels' => GradeLevels::all(),
            'sections' => $this->sectionOptions(),
            'placeholderDomain' => StudentCredentials::PLACEHOLDER_DOMAIN,
        ]);
    }

    /**
     * The roster template, as a real .xlsx.
     *
     * A CSV cell is free text, which is why grade_level used to arrive as
     * "Grade7" / "7th" / "G-7" and get rejected row by row. The .xlsx carries
     * data validation, so grade_level, section and enrollment_status are
     * dropdowns the teacher picks from — wrong values can't be typed in the
     * first place. It also formats the lrn column as Text, which is the fix for
     * 12-digit LRNs turning into 1.23E+11.
     */
    public function importTemplate(RosterTemplate $template)
    {
        $sections = Section::orderedFor(Auth::user()->school_id);
        $first = $sections->first();

        // The worked example uses this school's own first section when it has
        // one, so the file never demonstrates a value its dropdown rejects.
        $exampleGrade = $first?->grade_level ?? GradeLevels::all()[0];
        $exampleSection = $first?->name ?? '';

        $path = $template->build(
            GradeLevels::all(),
            $sections->pluck('name')->unique()->values()->all(),
            [
                ['123456789012', 'Juan', 'Santos', 'Cruz', '2011-04-12', $exampleGrade, $exampleSection, 'enrolled', ''],
                ['', 'Maria', 'Dela', 'Cruz', '2009-01-05', $exampleGrade, $exampleSection, 'enrolled', 'maria.cruz@gmail.com'],
            ]
        );

        return response()
            ->download($path, 'student_roster_template.xlsx', [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])
            ->deleteFileAfterSend();
    }

    public function import(Request $request, BatchImportService $service)
    {
        $request->validate([
            // The template we hand out is .xlsx, so .xlsx has to come back.
            // `extensions` is the real gate; `mimes` allows zip too because
            // fileinfo reports some Office files as a plain archive.
            'file' => ['required', 'file', 'max:10240', 'extensions:csv,txt,xlsx', 'mimes:csv,txt,xlsx,zip'],
            'default_grade' => ['nullable', Rule::in(GradeLevels::all())],
            'override_grade' => ['nullable', 'boolean'],
            'create_accounts' => ['nullable', 'boolean'],
        ], [
            'default_grade.in' => 'Grade level must be one of: ' . GradeLevels::options() . '.',
            'file.extensions' => 'Upload a .csv or .xlsx roster.',
            'file.mimes' => 'Upload a .csv or .xlsx roster.',
        ]);

        $currentUser = Auth::user();

        // Batch upload is school-admin-only — super admins manage schools and admins, not students.
        if ($currentUser->isSuperAdmin()) {
            abort(403, 'Batch upload is available to school admins only.');
        }

        if (!$currentUser->school_id) {
            return back()->with('error', 'Your admin account is not linked to a school. Ask the Super Admin to assign one before uploading.');
        }

        $createAccounts = $request->boolean('create_accounts', true);
        $overrideGrade = $request->boolean('override_grade');

        if ($overrideGrade && !$request->default_grade) {
            return back()->withErrors(['default_grade' => 'Pick a grade level before applying it to every row.'])->withInput();
        }

        // Admin top-up: assign every row to the admin's school and skip LRNs already in the registry.
        $result = $service->importLrnRegistry($request->file('file'), $currentUser->school_id, false, [
            'create_accounts' => $createAccounts,
            'default_grade' => $request->default_grade,
            'override_grade' => $overrideGrade,
        ]);

        $msg = $createAccounts
            ? "Registered {$result['registered']} student account(s) and added {$result['imported']} student(s) to your school's registry. Skipped {$result['skipped']}."
            : "Added {$result['imported']} new student(s) to your school's registry. Skipped {$result['skipped']} (LRN already exists or invalid).";

        if ($createAccounts && $result['registered'] > 0) {
            $msg .= ' Each password is the student\'s surname + birth year.';
        }

        return back()->with([
            $result['imported'] === 0 && $result['skipped'] === 0 ? 'error' : 'success' => $msg,
            'import_result' => $result,
        ]);
    }

    public function toggleActive(User $user)
    {
        if ($user->user_role !== 'user') {
            return redirect()->back()->with('error', 'You can only enable or disable student accounts here.');
        }

        $currentUser = Auth::user();
        if (!$currentUser->isSuperAdmin() && $user->school_id !== $currentUser->school_id) {
            abort(403, 'This student belongs to another school.');
        }

        // Block disable if student is enrolled and currently active
        if ($user->is_active) {
            if ($user->isEnrolled()) {
                return redirect()->back()->with('error', 'Cannot disable an enrolled student. Update their enrollment status first.');
            }
            if ($user->activeBorrowCount() > 0) {
                return redirect()->back()->with('error', 'Cannot disable a student with active borrowed books.');
            }
        }

        $user->update(['is_active' => !$user->is_active]);

        $action = $user->is_active ? 'enabled' : 'disabled';

        return redirect()->back()->with('success', "Student account {$action} successfully.");
    }

    public function destroy(User $user)
    {
        if ($user->user_role !== 'user') {
            return redirect()->back()->with('error', 'Only student accounts can be deleted here.');
        }

        $currentUser = Auth::user();
        if (!$currentUser->isSuperAdmin() && $user->school_id !== $currentUser->school_id) {
            abort(403, 'This student belongs to another school.');
        }

        if ($user->isEnrolled()) {
            return redirect()->back()->with('error', 'Cannot delete an enrolled student. Update their enrollment status first.');
        }

        if ($user->activeBorrowCount() > 0) {
            return redirect()->back()->with('error', 'Cannot delete a student with active borrowed books.');
        }

        $user->delete();
        return redirect()->back()->with('success', 'Student deleted successfully.');
    }

    /**
     * Move ONE student to another grade level (and section).
     *
     * The Sections page can only move a whole section at a time, which is the
     * wrong tool for "this Grade 7 student is now in Grade 8" — a single
     * promotion, a late transfer, a mis-typed grade on import. Grade and
     * section are set together because a section only exists inside one grade.
     */
    public function updatePlacement(Request $request, LrnRegistry $registry)
    {
        $currentUser = Auth::user();
        if (!$currentUser->isSuperAdmin() && $registry->school_id !== $currentUser->school_id) {
            abort(403, 'This student belongs to another school.');
        }

        $request->validate([
            'grade_level' => ['required', Rule::in(GradeLevels::all())],
            // Absent / null means "in the grade, but not in any section yet".
            'section_id' => ['nullable', 'integer'],
        ], [
            'grade_level.required' => 'Pick the grade level to move this student into.',
            'grade_level.in' => 'Grade level must be one of: ' . GradeLevels::options() . '.',
        ]);

        $section = null;
        if ($request->filled('section_id')) {
            $section = Section::where('school_id', $registry->school_id)
                ->find($request->integer('section_id'));

            if (!$section) {
                return back()->withErrors(['section_id' => 'That section is not one of this school\'s sections.']);
            }
            if ($section->grade_level !== $request->grade_level) {
                return back()->withErrors([
                    'section_id' => "\"{$section->name}\" is a {$section->grade_level} section, not {$request->grade_level}.",
                ]);
            }
        }

        $registry->update([
            'grade_level' => $request->grade_level,
            'section' => $section?->name,
        ]);

        $destination = $section
            ? "{$request->grade_level} – {$section->name}"
            : "{$request->grade_level} (no section)";

        return back()->with('success', "{$registry->name} moved to {$destination}.");
    }

    /**
     * Change a student's enrollment status from the Students list.
     * Updates the LRN-registry row and keeps the linked user account (matched
     * by LRN within the same school) in lockstep so the enrolled-student guards
     * on toggle/delete stay correct.
     */
    public function updateEnrollment(Request $request, LrnRegistry $registry)
    {
        $request->validate([
            'enrollment_status' => ['required', 'in:enrolled,not_enrolled,transferred,graduated'],
        ]);

        $currentUser = Auth::user();
        if (!$currentUser->isSuperAdmin() && $registry->school_id !== $currentUser->school_id) {
            abort(403, 'This student belongs to another school.');
        }

        $registry->update(['enrollment_status' => $request->enrollment_status]);

        // Sync the linked account — through the row→account link, so a student
        // registered without an LRN is reached too.
        $student = app(RegistryAccountLink::class)->accountFor($registry);
        if ($student && (int) $student->school_id === (int) $registry->school_id) {
            $student->update(['enrollment_status' => $request->enrollment_status]);
        }

        return redirect()->back()->with('success', 'Enrollment status updated.');
    }

    protected function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone);
        if (str_starts_with($digits, '63') && strlen($digits) === 12) {
            return '0' . substr($digits, 2);
        }
        return $digits;
    }
}
