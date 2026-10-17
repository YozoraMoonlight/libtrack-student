<?php

namespace App\Services;

use App\Models\Book;
use App\Models\Category;
use App\Models\LrnRegistry;
use App\Models\Section;
use App\Models\User;
use App\Support\GradeLevels;
use App\Support\StudentCredentials;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class BatchImportService
{
    /**
     * Parse an uploaded roster into rows keyed by header, whatever it arrived as.
     *
     * .xlsx is the format the downloadable template hands out — it is the only
     * one that can carry the grade_level / section dropdowns — so it has to be
     * the one that comes back. .csv and .txt still import unchanged.
     *
     * @return array{headers: array<int,string>, rows: array<int, array<string,string>>}
     */
    public function parse(UploadedFile $file): array
    {
        // Sniff the content rather than trusting the filename. The book importer
        // validates by MIME only, so a CSV saved as "roster.xlsx" is a legitimate
        // upload there — dispatching on the extension would hand it to the zip
        // reader and report every column as missing.
        return $this->isZipArchive($file->getRealPath())
            ? XlsxReader::read($file->getRealPath())
            : $this->parseCsv($file);
    }

    /** .xlsx is a zip; every other roster format this app accepts is plain text. */
    protected function isZipArchive(string $path): bool
    {
        $handle = @fopen($path, 'rb');
        if ($handle === false) {
            return false;
        }
        $magic = fread($handle, 4);
        fclose($handle);

        // "PK\x03\x04" — a local file header. Empty and single-entry-less zips
        // use PK\x05\x06 / PK\x07\x08, neither of which is a usable workbook.
        return $magic === "PK\x03\x04";
    }

    /**
     * Parse a CSV/TXT file into rows. Returns array of associative rows keyed by header.
     *
     * @return array{headers: array<int,string>, rows: array<int, array<string,string>>}
     */
    public function parseCsv(UploadedFile $file): array
    {
        $content = file_get_contents($file->getRealPath());
        if ($content === false) {
            return ['headers' => [], 'rows' => []];
        }

        // Excel saves CSVs as Windows-1252 (and prepends a UTF-8 BOM). Normalise
        // to UTF-8 up front so admins never have to re-save the file as "CSV
        // UTF-8" by hand — accented Filipino names (ñ, é) survive intact.
        $content = $this->normalizeToUtf8($content);

        // Parse from an in-memory stream so fgetcsv still handles quoted fields
        // and embedded newlines correctly.
        $handle = fopen('php://temp', 'r+');
        fwrite($handle, $content);
        rewind($handle);

        $headers = [];
        $rows = [];
        $first = true;

        while (($data = fgetcsv($handle, 0, ',', '"', '\\')) !== false) {
            if ($first) {
                $headers = array_map(fn ($h) => strtolower(trim((string) $h)), $data);
                $first = false;
                continue;
            }
            $assoc = [];
            foreach ($headers as $i => $key) {
                $assoc[$key] = isset($data[$i]) ? trim((string) $data[$i]) : '';
            }
            if (array_filter($assoc) !== []) {
                $rows[] = $assoc;
            }
        }
        fclose($handle);

        return ['headers' => $headers, 'rows' => $rows];
    }

    /**
     * Strip a UTF-8 BOM and transcode non-UTF-8 content (typically the
     * Windows-1252 that Excel writes) to UTF-8. Content that is already valid
     * UTF-8 — including ASCII and UTF-8 accented characters — is returned as-is.
     */
    protected function normalizeToUtf8(string $content): string
    {
        $content = preg_replace('/^\xEF\xBB\xBF/', '', $content);

        if (mb_check_encoding($content, 'UTF-8')) {
            return $content;
        }

        return mb_convert_encoding($content, 'UTF-8', 'Windows-1252');
    }

    /**
     * Clean up an LRN cell that a spreadsheet may have mangled: surrounding
     * whitespace, Excel's ="123…" text-formula wrapper, and the trailing ".0"
     * Excel appends when it treats the LRN as a number.
     */
    protected function normalizeLrn(string $raw): string
    {
        $lrn = trim($raw);

        // Excel "force text" formula: ="123456789012"
        if (str_starts_with($lrn, '="') && str_ends_with($lrn, '"')) {
            $lrn = substr($lrn, 2, -1);
        }

        // Excel float artifact: an integer saved as 123456789012.0
        if (preg_match('/^(\d+)\.0+$/', $lrn, $m)) {
            $lrn = $m[1];
        }

        return trim($lrn);
    }

    /**
     * True when a value looks like spreadsheet scientific notation (e.g.
     * "1.23457E+11"). Such values have lost digits and can't be recovered, so
     * the importer rejects them with guidance instead of guessing.
     */
    protected function looksLikeScientificNotation(string $value): bool
    {
        return (bool) preg_match('/^\d(?:\.\d+)?[eE][+\-]?\d+$/', $value);
    }

    /**
     * Fold a human-entered enrollment status to its canonical enum value:
     * lowercase and collapse spaces/hyphens to underscores so "Not Enrolled",
     * "not enrolled" and "NOT-ENROLLED" all become "not_enrolled".
     */
    protected function normalizeEnrollmentStatus(string $raw): string
    {
        return preg_replace('/[\s\-]+/', '_', strtolower(trim($raw)));
    }

    /**
     * Compose the canonical full name from its parts, matching the
     * manual-register form: "First Middle Last" with single spaces and no
     * stray spacing when the middle name is blank.
     */
    protected function composeName(?string $first, ?string $middle, ?string $last): string
    {
        $first = trim((string) $first);
        $middle = trim((string) $middle);
        $last = trim((string) $last);

        return trim($first . ' ' . ($middle !== '' ? $middle . ' ' : '') . $last);
    }

    /**
     * Import books. Each row: title, author, isbn (optional), category, total_copies, location (optional).
     */
    public function importBooks(UploadedFile $file, ?int $schoolIdScope = null): array
    {
        try {
            $parsed = $this->parse($file);
        } catch (\RuntimeException $e) {
            return [
                'imported' => 0,
                'skipped' => 0,
                'errors' => [['row' => 0, 'reason' => $e->getMessage()]],
            ];
        }

        $required = ['title', 'author', 'category', 'total_copies'];
        $missing = array_diff($required, $parsed['headers']);
        if (!empty($missing)) {
            return [
                'imported' => 0,
                'skipped' => 0,
                'errors' => [['row' => 0, 'reason' => 'Missing required columns: ' . implode(', ', $missing)]],
            ];
        }

        $imported = 0;
        $skipped = 0;
        $errors = [];

        DB::transaction(function () use ($parsed, $schoolIdScope, &$imported, &$skipped, &$errors) {
            foreach ($parsed['rows'] as $i => $row) {
                $rowNum = $i + 2;
                $title = trim($row['title'] ?? '');
                $author = trim($row['author'] ?? '');
                $isbn = trim($row['isbn'] ?? '') ?: null;
                $categoryName = trim($row['category'] ?? '');
                $copies = (int) trim($row['total_copies'] ?? '0');
                $location = trim($row['location'] ?? '') ?: null;

                if ($title === '' || $author === '' || $categoryName === '') {
                    $errors[] = ['row' => $rowNum, 'title' => $title, 'reason' => 'Missing title/author/category.'];
                    $skipped++;
                    continue;
                }
                if ($copies < 1) {
                    $errors[] = ['row' => $rowNum, 'title' => $title, 'reason' => 'total_copies must be at least 1.'];
                    $skipped++;
                    continue;
                }

                $category = Category::firstOrCreate(['name' => $categoryName]);

                // ISBN uniqueness is per-school (matches the books_school_id_isbn
                // partial unique index) — the same ISBN may exist at another school.
                if ($isbn && Book::where('isbn', $isbn)->where('school_id', $schoolIdScope)->exists()) {
                    $errors[] = ['row' => $rowNum, 'title' => $title, 'reason' => 'Duplicate ISBN.'];
                    $skipped++;
                    continue;
                }

                Book::create([
                    'title' => $title,
                    'author' => $author,
                    'isbn' => $isbn,
                    'category_id' => $category->id,
                    'school_id' => $schoolIdScope,
                    'total_copies' => $copies,
                    'available_copies' => $copies,
                    'location' => $location,
                    'status' => 'available',
                    'qr_code' => (string) Str::uuid(),
                ]);
                $imported++;
            }
        });

        return ['imported' => $imported, 'skipped' => $skipped, 'errors' => $errors];
    }

    /**
     * Import LRN registry rows.
     *
     * - $schoolIdScope: when set, every row is assigned to this school and CSV school_code is ignored.
     * - $updateExisting: true => existing LRNs are updated in place (super admin master upload);
     *                   false => existing LRNs are silently skipped (school admin top-up).
     *
     * Name accepts two formats:
     *   - split  : first_name (+ optional middle_name) + last_name — matches the
     *              manual-register form and is the current template.
     *   - legacy : a single `name` column — older rosters still import.
     *
     * Each row: lrn, first_name/middle_name/last_name (or legacy name),
     *           [school_code], grade_level (optional, must be one of
     *           GradeLevels::ALL), section (optional), enrollment_status
     *           (optional), birthdate (required when creating accounts),
     *           email (optional — auto-generated when blank).
     *
     * When $options['create_accounts'] is true each imported row also gets a
     * login whose password is SURNAME + BIRTH YEAR (e.g. Montenegro2005). The
     * plaintext defaults come back under `credentials` so the admin can hand
     * them out; they're derivable from the roster anyway.
     */
    public function importLrnRegistry(UploadedFile $file, ?int $schoolIdScope = null, bool $updateExisting = true, array $options = []): array
    {
        // Options (all optional, so the existing 3-arg callers are unchanged):
        //   create_accounts  bool   also create a login for every imported student
        //   default_grade    string grade applied to rows whose grade_level is blank
        //   override_grade   bool   apply default_grade to EVERY row, ignoring the CSV
        $createAccounts = (bool) ($options['create_accounts'] ?? false);
        $defaultGrade = GradeLevels::normalize($options['default_grade'] ?? null);
        $overrideGrade = (bool) ($options['override_grade'] ?? false);

        try {
            $parsed = $this->parse($file);
        } catch (\RuntimeException $e) {
            // A workbook we refuse to inflate. Reported like any other
            // file-level problem so the admin sees why, not a blank result.
            return $this->emptyStudentResult($e->getMessage());
        }

        // Presence of first_name/last_name headers selects the split-name
        // format; otherwise fall back to the legacy single `name` column.
        $splitName = in_array('first_name', $parsed['headers'], true)
            || in_array('last_name', $parsed['headers'], true);

        // `lrn` is optional — students without an LRN yet can still be uploaded.
        $nameColumns = $splitName ? ['first_name', 'last_name'] : ['name'];
        $required = array_merge($nameColumns, $schoolIdScope === null ? ['school_code'] : []);
        $missing = array_diff($required, $parsed['headers']);
        if (!empty($missing)) {
            // Must carry the same keys as the success path — the controller and
            // the page both read `registered` and `credentials`.
            return $this->emptyStudentResult('Missing required columns: ' . implode(', ', $missing));
        }

        $imported = 0;
        $skipped = 0;
        $registered = 0;
        $errors = [];
        // Plaintext default passwords for the accounts created in THIS run, so
        // the admin can hand them out. They are derived from surname + birth
        // year, so nothing secret is being revealed that the admin didn't type.
        $credentials = [];
        $schoolCache = [];
        // Tracks "<schoolId>|<lower(name)>" keys for blank-LRN rows already
        // inserted in THIS batch, so a single upload that repeats the same
        // name (or re-uploads of the same file) does not duplicate students
        // who have no LRN to dedupe on. See the null-LRN branch below.
        $seenNoLrn = [];
        // (grade_level, section) pairs this roster actually filed a student under,
        // grouped by school. Synced into the sections table after the loop so the
        // manual-register dropdown can always offer the section a roster used —
        // otherwise a student imported into "G7-C" could never be re-picked there.
        $sectionsSeen = [];

        // Per-row processing — no outer transaction. A single bad row (DB
        // constraint violation, etc.) is captured and reported as a row-level
        // error so the remaining rows still import.
        foreach ($parsed['rows'] as $i => $row) {
            $rowNum = $i + 2;
            $lrn = $this->normalizeLrn($row['lrn'] ?? '');
            $rawGrade = trim($row['grade_level'] ?? '');
            $rawBirthdate = trim($row['birthdate'] ?? '');
            $rawEmail = trim($row['email'] ?? '');
            $section = trim($row['section'] ?? '') ?: null;
            $rawStatus = trim($row['enrollment_status'] ?? '');

            if ($splitName) {
                $first = trim($row['first_name'] ?? '');
                $middle = trim($row['middle_name'] ?? '');
                $last = trim($row['last_name'] ?? '');
                $name = $this->composeName($first, $middle, $last);
            } else {
                // Legacy single-name roster: keep the parts empty rather than
                // guessing how to split a full name (lossy for multi-word surnames).
                $first = $middle = $last = '';
                $name = trim($row['name'] ?? '');
            }

            // LRN is optional, but if provided must be exactly 12 digits.
            if ($lrn !== '' && !preg_match('/^\d{12}$/', $lrn)) {
                $reason = $this->looksLikeScientificNotation($lrn)
                    ? "LRN was corrupted by a spreadsheet (saved as \"{$lrn}\"). Format the LRN column as Text before saving, or edit the CSV in Google Sheets or a plain-text editor."
                    : 'LRN must be 12 digits when provided.';
                $errors[] = ['row' => $rowNum, 'lrn' => $lrn, 'reason' => $reason];
                $skipped++;
                continue;
            }
            $lrn = $lrn === '' ? null : $lrn;

            if ($splitName && ($first === '' || $last === '')) {
                $errors[] = ['row' => $rowNum, 'lrn' => $lrn, 'reason' => 'Missing first_name or last_name.'];
                $skipped++;
                continue;
            }
            if ($name === '') {
                $errors[] = ['row' => $rowNum, 'lrn' => $lrn, 'reason' => 'Missing name.'];
                $skipped++;
                continue;
            }

            // Persist parts only when supplied; legacy single-name rows leave them null.
            $firstName = $first !== '' ? $first : null;
            $middleName = $middle !== '' ? $middle : null;
            $lastName = $last !== '' ? $last : null;

            // Grade level is a fixed list, not free text — it drives the same
            // dropdown the manual-register form uses. The page-level picker
            // fills blanks (or overrides every row when the admin asks).
            if ($overrideGrade && $defaultGrade !== null) {
                $grade = $defaultGrade;
            } elseif ($rawGrade === '') {
                $grade = $defaultGrade;
            } else {
                $grade = GradeLevels::normalize($rawGrade);
                if ($grade === null) {
                    $errors[] = [
                        'row' => $rowNum,
                        'lrn' => $lrn,
                        'reason' => "grade_level must be one of: " . GradeLevels::options() . " (got \"{$rawGrade}\").",
                    ];
                    $skipped++;
                    continue;
                }
            }

            // Birthdate is what the student's password is derived from, so it is
            // required whenever this import is also creating accounts. Both are
            // reset per row so a skipped row can never leak into the next one.
            $birthdate = null;
            $derived = null;
            $birthdateReason = null;
            if ($rawBirthdate !== '') {
                $birthdate = StudentCredentials::parseBirthdate($rawBirthdate);
                if ($birthdate === null) {
                    // Same rule as a blank cell: a birthdate problem costs the row
                    // its login, never its roster entry. One bad cell must not
                    // throw away an otherwise good 500-student roster.
                    $birthdateReason = "birthdate \"{$rawBirthdate}\" could not be read. Use YYYY-MM-DD (e.g. 2005-04-12).";
                }
            }

            // Whether this row can get a login. A failure here must NOT stop the
            // roster row from importing — a CSV with no birthdate column still
            // populates the registry exactly as it did before direct
            // registration existed; it just can't issue passwords.
            $canRegister = $createAccounts;
            $accountReason = null;

            if ($createAccounts) {
                if ($birthdate === null) {
                    $canRegister = false;
                    $accountReason = $birthdateReason !== null
                        ? 'No account created: ' . $birthdateReason
                        : 'No account created: birthdate is missing — the password is the surname + birth year.';
                } elseif ($lastName === null) {
                    $canRegister = false;
                    $accountReason = 'No account created: last_name is required to build the password (surname + birth year).';
                } elseif ($rawEmail !== '' && !filter_var($rawEmail, FILTER_VALIDATE_EMAIL)) {
                    $canRegister = false;
                    $accountReason = "No account created: email \"{$rawEmail}\" is not a valid address.";
                } elseif ($rawEmail !== '' && User::where('email', $rawEmail)->exists()) {
                    $canRegister = false;
                    $accountReason = "No account created: email \"{$rawEmail}\" already belongs to another account.";
                } elseif ($lrn !== null && User::where('lrn', $lrn)->exists()) {
                    $canRegister = false;
                    $accountReason = 'No account created: a student account already exists for this LRN.';
                } else {
                    // The derived password must clear the same minimum the manual
                    // form enforces, or the admin would hand out a credential the
                    // app itself would refuse. Only bites on surnames with fewer
                    // than two letters (e.g. all-punctuation or a single glyph).
                    $derived = StudentCredentials::derivePassword($lastName, $birthdate);
                    if ($derived === null || strlen($derived) < 6) {
                        $canRegister = false;
                        $accountReason = "No account created: cannot build a password from the surname \"{$lastName}\" — it needs at least two letters. Register this student from the Manual Register page with a password you choose.";
                    }
                }
            }

            if ($schoolIdScope !== null) {
                $schoolId = $schoolIdScope;
            } else {
                $schoolCode = trim($row['school_code'] ?? '');
                if ($schoolCode === '') {
                    $errors[] = ['row' => $rowNum, 'lrn' => $lrn, 'reason' => 'Missing school_code.'];
                    $skipped++;
                    continue;
                }
                if (!isset($schoolCache[$schoolCode])) {
                    $schoolCache[$schoolCode] = \App\Models\School::where('code', $schoolCode)->first();
                }
                $school = $schoolCache[$schoolCode];
                if (!$school) {
                    $errors[] = ['row' => $rowNum, 'lrn' => $lrn, 'reason' => 'School code not found: ' . $schoolCode];
                    $skipped++;
                    continue;
                }
                $schoolId = $school->id;
            }

            // enrollment_status is optional; a blank cell defaults to enrolled.
            // Any provided value must be one of the four DepEd states — human
            // variants like "Not Enrolled" are normalised, but anything else is a
            // row-level error rather than being silently treated as enrolled.
            if ($rawStatus === '') {
                $status = 'enrolled';
            } else {
                $status = $this->normalizeEnrollmentStatus($rawStatus);
                if (!in_array($status, ['enrolled', 'not_enrolled', 'transferred', 'graduated'], true)) {
                    $errors[] = ['row' => $rowNum, 'lrn' => $lrn, 'reason' => "enrollment_status must be one of: enrolled, not_enrolled, transferred, graduated (got \"{$rawStatus}\")."];
                    $skipped++;
                    continue;
                }
            }

            // Per row the registry write and the account write are INDEPENDENT.
            // A student already on the roster (very common — the school uploaded
            // one before direct registration existed) must still be able to get
            // an account, and a roster with no birthdate column must still
            // populate the registry.
            $registryAdded = false;
            $accountCreated = false;
            $registryReason = null;
            // The row this line of the file lands on, so a new account can be linked to it.
            $registryRow = null;

            try {
                // updateOrCreate keys on LRN. Rows without an LRN can't be
                // deduped on it (Postgres/SQLite treat every NULL as distinct,
                // so the UNIQUE index never blocks them), so they are deduped
                // on name within the school instead — see the null branch below.
                if ($updateExisting && $lrn !== null) {
                    $registryRow = LrnRegistry::updateOrCreate(
                        ['lrn' => $lrn],
                        [
                            'name' => $name,
                            'first_name' => $firstName,
                            'middle_name' => $middleName,
                            'last_name' => $lastName,
                            'birthdate' => $birthdate,
                            'school_id' => $schoolId,
                            'grade_level' => $grade,
                            'section' => $section,
                            'enrollment_status' => $status,
                        ]
                    );
                    $registryAdded = true;
                    $this->rememberSection($sectionsSeen, $schoolId, $grade, $section);
                } else {
                    $duplicate = false;

                    if ($lrn !== null) {
                        $existing = LrnRegistry::with('school:id,code')->where('lrn', $lrn)->first();
                        if ($existing) {
                            if ($existing->school_id !== $schoolId) {
                                // Cross-school: a hard stop. Never create an
                                // account for a student enrolled elsewhere.
                                $errors[] = [
                                    'row' => $rowNum,
                                    'lrn' => $lrn,
                                    'reason' => 'LRN already enrolled at ' . ($existing->school?->code ?? 'another school') . '. Contact super admin to transfer.',
                                ];
                                $skipped++;
                                continue;
                            }
                            $duplicate = true;
                            $registryReason = 'LRN already in your registry.';
                            $registryRow = $existing;

                            // Fill in a birthdate the roster row was missing so
                            // the student's password stays re-derivable later.
                            if ($birthdate !== null && $existing->birthdate === null) {
                                $existing->update(['birthdate' => $birthdate]);
                            }
                        }
                    } else {
                        // Blank LRN: there's no LRN to dedupe on, so match an
                        // existing student by name within this school (case-
                        // insensitive). Grade/section are intentionally left out
                        // of the key — they change (promotions, re-sectioning)
                        // and would otherwise re-open the duplicate hole on the
                        // next roster upload. The in-batch seen-set catches the
                        // same name repeated within a single file.
                        $key = $schoolId . '|' . strtolower($name);
                        $dup = isset($seenNoLrn[$key])
                            || LrnRegistry::whereNull('lrn')
                                ->where('school_id', $schoolId)
                                ->whereRaw('lower(name) = ?', [strtolower($name)])
                                ->exists();
                        if ($dup) {
                            // No LRN means no reliable key to attach an account
                            // to either, so this stays a hard skip.
                            $errors[] = ['row' => $rowNum, 'lrn' => null, 'reason' => 'A student with this name is already in your registry. Add their LRN to register them as distinct.'];
                            $skipped++;
                            continue;
                        }
                        $seenNoLrn[$key] = true;
                    }

                    if (!$duplicate) {
                        $registryRow = LrnRegistry::create([
                            'lrn' => $lrn,
                            'name' => $name,
                            'first_name' => $firstName,
                            'middle_name' => $middleName,
                            'last_name' => $lastName,
                            'birthdate' => $birthdate,
                            'school_id' => $schoolId,
                            'grade_level' => $grade,
                            'section' => $section,
                            'enrollment_status' => $status,
                        ]);
                        $registryAdded = true;
                        $this->rememberSection($sectionsSeen, $schoolId, $grade, $section);
                    }
                }

                // "Directly registered": the roster row alone doesn't let a
                // student log in, so create the account too.
                if ($canRegister) {
                    $password = $derived;
                    $email = $rawEmail !== ''
                        ? $rawEmail
                        : StudentCredentials::generateEmail($lrn, $firstName, $lastName);

                    $account = User::create([
                        'name' => $name,
                        'first_name' => $firstName,
                        'middle_name' => $middleName,
                        'last_name' => $lastName,
                        'birthdate' => $birthdate,
                        'email' => $email,
                        'password' => Hash::make($password),
                        'user_role' => 'user',
                        'student_id' => $lrn,
                        'lrn' => $lrn,
                        'enrollment_status' => $status,
                        'school_id' => $schoolId,
                        'is_active' => true,
                    ]);

                    // A row with no LRN has no other way to find this account.
                    if ($registryRow) {
                        app(RegistryAccountLink::class)->link($registryRow, $account);
                    }

                    $accountCreated = true;
                    $credentials[] = [
                        'row' => $rowNum,
                        'name' => $name,
                        'lrn' => $lrn,
                        'grade_level' => $grade,
                        'section' => $section,
                        'email' => $email,
                        'password' => $password,
                        'generated_email' => $rawEmail === '',
                    ];
                }
            } catch (\Illuminate\Database\QueryException $e) {
                // Surface the DB error as a row-level reason instead of nuking
                // the whole batch. Most common: a unique index firing because a
                // concurrent import claimed the same email or LRN.
                $errors[] = [
                    'row' => $rowNum,
                    'lrn' => $lrn,
                    'reason' => 'Database error: ' . $this->cleanDbMessage($e->getMessage()),
                ];
                $this->tally($registryAdded, $accountCreated, $imported, $registered, $skipped);
                continue;
            } catch (\Throwable $e) {
                $errors[] = ['row' => $rowNum, 'lrn' => $lrn, 'reason' => 'Unexpected error: ' . $e->getMessage()];
                $this->tally($registryAdded, $accountCreated, $imported, $registered, $skipped);
                continue;
            }

            $this->tally($registryAdded, $accountCreated, $imported, $registered, $skipped);

            // Only surface a reason when the row did NOT achieve the thing the
            // admin asked for. A duplicate roster row that still produced a
            // login is a success, not an error.
            if (!$accountCreated) {
                $reason = $createAccounts
                    ? ($accountReason ?? $registryReason)
                    : ($birthdateReason ?? $registryReason);

                if ($reason !== null) {
                    $errors[] = ['row' => $rowNum, 'lrn' => $lrn, 'reason' => $reason];
                }
            }
        }

        $this->syncSections($sectionsSeen);

        // `registered` and `credentials` are additive — existing callers and
        // tests read imported/skipped/errors and are unaffected.
        return [
            'imported' => $imported,
            'skipped' => $skipped,
            'registered' => $registered,
            'errors' => $errors,
            'credentials' => $credentials,
        ];
    }

    /**
     * Note a (grade, section) pair an imported row was filed under.
     *
     * Keyed case-insensitively so "G7-A" and "g7-a" in the same roster are one
     * section; the first spelling seen is the one that gets created.
     *
     * @param  array<int, array<string, array{0: string, 1: string}>>  $seen
     */
    protected function rememberSection(array &$seen, ?int $schoolId, ?string $grade, ?string $section): void
    {
        if ($schoolId === null || $grade === null || $section === null || trim($section) === '') {
            return;
        }

        $key = mb_strtolower($grade . '|' . trim($section));
        $seen[$schoolId][$key] ??= [$grade, trim($section)];
    }

    /**
     * Create any section a roster used that the school had not set up yet.
     *
     * A roster is allowed to introduce sections — blocking the import would
     * strand the whole file over one new class — but every section it names
     * becomes a real, editable record so the dropdowns stay in step with the
     * data. Admins can rename or delete them on the Sections page.
     *
     * @param  array<int, array<string, array{0: string, 1: string}>>  $seen
     */
    protected function syncSections(array $seen): void
    {
        foreach ($seen as $schoolId => $pairs) {
            if ($pairs === []) {
                continue;
            }

            $existing = Section::where('school_id', $schoolId)
                ->get(['grade_level', 'name'])
                ->map(fn ($section) => mb_strtolower($section->grade_level . '|' . $section->name))
                ->flip();

            $now = now();
            $insert = [];
            foreach ($pairs as $key => [$grade, $name]) {
                if ($existing->has($key)) {
                    continue;
                }
                $insert[] = [
                    'school_id' => $schoolId,
                    'grade_level' => $grade,
                    'name' => $name,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            // insertOrIgnore: a concurrent import may have just created the same
            // section, and losing that race must not fail the roster.
            foreach (array_chunk($insert, 200) as $chunk) {
                Section::insertOrIgnore($chunk);
            }
        }
    }

    /**
     * The canonical empty result for the student importer, used when the file
     * can't be processed at all. Keeping every key present means callers never
     * have to guard against a partial shape.
     *
     * @return array{imported:int, skipped:int, registered:int, errors:array, credentials:array}
     */
    protected function emptyStudentResult(string $reason): array
    {
        return [
            'imported' => 0,
            'skipped' => 0,
            'registered' => 0,
            'errors' => [['row' => 0, 'lrn' => null, 'reason' => $reason]],
            'credentials' => [],
        ];
    }

    /**
     * Count one processed row. A row counts as skipped only when it produced
     * NEITHER a registry row NOR an account — otherwise it did something useful.
     */
    protected function tally(bool $registryAdded, bool $accountCreated, int &$imported, int &$registered, int &$skipped): void
    {
        if ($registryAdded) {
            $imported++;
        }
        if ($accountCreated) {
            $registered++;
        }
        if (!$registryAdded && !$accountCreated) {
            $skipped++;
        }
    }

    /**
     * Trim noisy SQL details from QueryException messages so the UI shows
     * the part that matters to a school admin (e.g. "null value in column lrn").
     */
    protected function cleanDbMessage(string $message): string
    {
        // Keep only the first meaningful line and strip the "(Connection:..., SQL: ...)" tail.
        $first = explode("\n", $message, 2)[0];
        $first = preg_replace('/\s*\(Connection:.*$/', '', $first);
        // Trim "SQLSTATE[...]" prefix
        $first = preg_replace('/^SQLSTATE\[\w+\]:?\s*(\[\d+\])?\s*/', '', (string) $first);
        return trim((string) $first);
    }
}
