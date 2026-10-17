<?php

namespace Tests\Feature;

use App\Models\LrnRegistry;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * QA coverage for the LRN batch upload flow.
 *
 * LRN batch upload is school-admin-only — super admins manage schools and
 * school admins, not student records. Super admins hitting the upload route
 * are now blocked with 403.
 */
class BatchImportLrnRegistryTest extends TestCase
{
    use RefreshDatabase;

    protected School $schoolA;
    protected School $schoolB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->schoolA = School::create(['code' => 'AAA', 'name' => 'Alpha School', 'is_active' => true]);
        $this->schoolB = School::create(['code' => 'BBB', 'name' => 'Bravo School', 'is_active' => true]);
    }

    private function user(string $role, ?int $schoolId = null): User
    {
        return User::factory()->create([
            'user_role' => $role,
            'is_active' => true,
            'school_id' => $schoolId,
            'password' => Hash::make('Password1!'),
            'phone' => '09171234500',
        ]);
    }

    private function csv(string $contents): UploadedFile
    {
        $tmp = tempnam(sys_get_temp_dir(), 'csv_');
        file_put_contents($tmp, $contents);
        return new UploadedFile($tmp, 'students.csv', 'text/csv', null, true);
    }

    // ------------------------------------------------------------------
    //  School-admin batch upload
    // ------------------------------------------------------------------

    public function test_admin_import_assigns_admin_school_and_imports_new_rows(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);

        $csv = $this->csv("lrn,name\n111111111111,Alice\n222222222222,Bob\n");

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $csv])
            ->assertRedirect();

        $this->assertDatabaseHas('lrn_registry', ['lrn' => '111111111111', 'name' => 'Alice', 'school_id' => $this->schoolA->id]);
        $this->assertDatabaseHas('lrn_registry', ['lrn' => '222222222222', 'name' => 'Bob', 'school_id' => $this->schoolA->id]);
    }

    public function test_admin_import_skips_existing_lrns_and_surfaces_them_with_a_reason(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);

        // Pre-existing entry already in another school's registry.
        LrnRegistry::create([
            'lrn' => '111111111111',
            'name' => 'Alice (existing)',
            'school_id' => $this->schoolB->id,
            'enrollment_status' => 'enrolled',
        ]);

        $resp = $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $this->csv("lrn,name\n111111111111,Alice\n222222222222,Bob\n")]);

        $resp->assertRedirect();

        // Existing LRN must not be moved to Admin's school.
        $this->assertDatabaseHas('lrn_registry', [
            'lrn' => '111111111111',
            'name' => 'Alice (existing)',
            'school_id' => $this->schoolB->id,
        ]);

        // New row landed under admin's school.
        $this->assertDatabaseHas('lrn_registry', ['lrn' => '222222222222', 'school_id' => $this->schoolA->id]);

        // The duplicate must now be surfaced with a reason so admins know what was skipped.
        $result = session('import_result');
        $this->assertSame(1, $result['imported']);
        $this->assertSame(1, $result['skipped']);
        $this->assertNotEmpty($result['errors'], 'Skipped duplicates must be surfaced with a reason.');
        $this->assertSame('111111111111', $result['errors'][0]['lrn']);
        $this->assertStringContainsString('already enrolled', $result['errors'][0]['reason']);
    }

    public function test_admin_import_invalid_lrn_is_reported_as_error(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);

        $csv = $this->csv("lrn,name\nNOT-A-NUMBER,Alice\n");

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $csv])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(0, $result['imported']);
        $this->assertSame(1, $result['skipped']);
        $this->assertNotEmpty($result['errors']);
        $this->assertStringContainsString('LRN must be 12 digits', $result['errors'][0]['reason']);
    }

    public function test_admin_import_accepts_rows_without_lrn(): void
    {
        // Regression for the school-admin batch-upload bug: rows without an LRN
        // (students who haven't been issued one yet) must be imported, not skipped.
        $admin = $this->user('school_admin', $this->schoolA->id);

        $csv = $this->csv("lrn,name\n,Alice (no LRN)\n111111111111,Bob\n,Carol (no LRN)\n");

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $csv])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(3, $result['imported']);
        $this->assertSame(0, $result['skipped']);

        // All three rows should be in the registry. Two with null LRN, one with the digits.
        $this->assertDatabaseHas('lrn_registry', ['name' => 'Alice (no LRN)', 'lrn' => null, 'school_id' => $this->schoolA->id]);
        $this->assertDatabaseHas('lrn_registry', ['name' => 'Carol (no LRN)', 'lrn' => null, 'school_id' => $this->schoolA->id]);
        $this->assertDatabaseHas('lrn_registry', ['name' => 'Bob', 'lrn' => '111111111111', 'school_id' => $this->schoolA->id]);
    }

    public function test_admin_reimport_does_not_duplicate_blank_lrn_students(): void
    {
        // Regression for the reported "double entry" bug: re-uploading the same
        // CSV must not create a second copy of a blank-LRN student. The two
        // rows WITH an LRN are correctly skipped on the second pass (LRN
        // already exists); the blank-LRN row must be skipped too, not re-added.
        $admin = $this->user('school_admin', $this->schoolA->id);

        $sample = "lrn,name,grade_level,section,enrollment_status\n"
            . "123456789012,Juan Dela Cruz,Grade 10,Mabini,enrolled\n"
            . "123456789013,Pedro Reyes,Grade 11,Rizal,enrolled\n"
            . ",Maria Santos,Grade 9,Bonifacio,enrolled\n";

        // First import: all three rows land.
        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $this->csv($sample)])
            ->assertRedirect();
        $first = session('import_result');
        $this->assertSame(3, $first['imported']);
        $this->assertSame(0, $first['skipped']);

        // Second import of the identical file: nothing new, all three skipped.
        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $this->csv($sample)])
            ->assertRedirect();
        $second = session('import_result');
        $this->assertSame(0, $second['imported']);
        $this->assertSame(3, $second['skipped']);

        // The blank-LRN student exists exactly once — no double entry.
        $this->assertSame(1, LrnRegistry::whereNull('lrn')
            ->where('school_id', $this->schoolA->id)
            ->where('name', 'Maria Santos')
            ->count());

        $reasons = collect($second['errors'])->pluck('reason')->implode(' | ');
        $this->assertStringContainsString('already in your registry', $reasons);
    }

    public function test_admin_import_dedupes_repeated_blank_lrn_within_one_file(): void
    {
        // A single upload that repeats the same blank-LRN name (any casing)
        // must insert it only once — the in-batch guard, not just the DB check.
        $admin = $this->user('school_admin', $this->schoolA->id);

        $csv = $this->csv("lrn,name\n,Maria Santos\n,Maria Santos\n,maria santos\n");

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $csv])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(1, $result['imported']);
        $this->assertSame(2, $result['skipped']);
        $this->assertSame(1, LrnRegistry::whereNull('lrn')
            ->where('school_id', $this->schoolA->id)
            ->count());
    }

    public function test_admin_import_blank_lrn_dedup_is_case_insensitive_against_existing(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);

        LrnRegistry::create([
            'lrn' => null,
            'name' => 'Maria Santos',
            'school_id' => $this->schoolA->id,
            'enrollment_status' => 'enrolled',
        ]);

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $this->csv("lrn,name\n,maria santos\n")])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(0, $result['imported']);
        $this->assertSame(1, $result['skipped']);
        $this->assertSame(1, LrnRegistry::whereNull('lrn')
            ->where('school_id', $this->schoolA->id)
            ->count());
    }

    public function test_admin_import_blank_lrn_dedup_is_scoped_per_school(): void
    {
        // A blank-LRN student with the same name at ANOTHER school is a
        // different person — the import must still add them under this school.
        $admin = $this->user('school_admin', $this->schoolA->id);

        LrnRegistry::create([
            'lrn' => null,
            'name' => 'Maria Santos',
            'school_id' => $this->schoolB->id,
            'enrollment_status' => 'enrolled',
        ]);

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $this->csv("lrn,name\n,Maria Santos\n")])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(1, $result['imported']);
        $this->assertSame(0, $result['skipped']);
        $this->assertDatabaseHas('lrn_registry', [
            'name' => 'Maria Santos',
            'lrn' => null,
            'school_id' => $this->schoolA->id,
        ]);
    }

    public function test_admin_import_csv_without_lrn_column_still_works(): void
    {
        // Some admins won't even include the LRN column. Make sure that still imports.
        $admin = $this->user('school_admin', $this->schoolA->id);

        $csv = $this->csv("name,grade_level\nAlice,Grade 10\nBob,Grade 11\n");

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $csv])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(2, $result['imported']);
        $this->assertDatabaseHas('lrn_registry', ['name' => 'Alice', 'grade_level' => 'Grade 10', 'school_id' => $this->schoolA->id]);
        $this->assertDatabaseHas('lrn_registry', ['name' => 'Bob', 'grade_level' => 'Grade 11', 'school_id' => $this->schoolA->id]);
    }

    // ------------------------------------------------------------------
    //  Split first/middle/last name columns (matches the manual form)
    // ------------------------------------------------------------------

    public function test_admin_import_accepts_split_name_columns(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);

        $csv = $this->csv("lrn,first_name,middle_name,last_name,grade_level\n123456789012,Juan,Santos,Cruz,Grade 7\n");

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $csv])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(1, $result['imported']);
        // Parts are stored AND composed into the canonical `name`.
        $this->assertDatabaseHas('lrn_registry', [
            'lrn' => '123456789012',
            'name' => 'Juan Santos Cruz',
            'first_name' => 'Juan',
            'middle_name' => 'Santos',
            'last_name' => 'Cruz',
            'grade_level' => 'Grade 7',
            'school_id' => $this->schoolA->id,
        ]);
    }

    public function test_admin_import_split_name_blank_middle_is_null(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);

        $csv = $this->csv("lrn,first_name,middle_name,last_name\n,Pedro,,Reyes\n");

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $csv])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(1, $result['imported']);
        $this->assertDatabaseHas('lrn_registry', [
            'name' => 'Pedro Reyes',
            'first_name' => 'Pedro',
            'middle_name' => null,
            'last_name' => 'Reyes',
            'lrn' => null,
            'school_id' => $this->schoolA->id,
        ]);
    }

    public function test_admin_import_split_name_requires_first_and_last(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);

        // Row 2's last_name is blank — that row is skipped, the complete row imports.
        $csv = $this->csv("first_name,middle_name,last_name\nMaria,Dela,Cruz\nJuan,,\n");

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $csv])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(1, $result['imported']);
        $this->assertSame(1, $result['skipped']);
        $this->assertStringContainsString('first_name or last_name', $result['errors'][0]['reason']);
        $this->assertDatabaseHas('lrn_registry', ['name' => 'Maria Dela Cruz']);
        $this->assertDatabaseMissing('lrn_registry', ['first_name' => 'Juan']);
    }

    public function test_admin_import_split_name_blank_lrn_dedupes_by_composed_name(): void
    {
        // Re-importing the same blank-LRN split-name student must not duplicate.
        $admin = $this->user('school_admin', $this->schoolA->id);

        $csv = "first_name,middle_name,last_name\nMaria,Dela,Cruz\nMaria,Dela,Cruz\n";

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $this->csv($csv)])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(1, $result['imported']);
        $this->assertSame(1, $result['skipped']);
        $this->assertSame(1, LrnRegistry::whereNull('lrn')
            ->where('school_id', $this->schoolA->id)
            ->where('name', 'Maria Dela Cruz')
            ->count());
    }

    public function test_admin_import_continues_when_one_row_fails(): void
    {
        // Regression: a CSV with one bad row (e.g. duplicate in same school)
        // must not nuke the whole batch — the good rows still import.
        $admin = $this->user('school_admin', $this->schoolA->id);

        \App\Models\LrnRegistry::create([
            'lrn' => '111111111111',
            'name' => 'Existing',
            'school_id' => $this->schoolA->id,
            'enrollment_status' => 'enrolled',
        ]);

        $csv = $this->csv("lrn,name\n111111111111,Duplicate\n222222222222,FreshA\n,FreshB (no LRN)\n");

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $csv])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(2, $result['imported'], 'Good rows must import even when one fails.');
        $this->assertSame(1, $result['skipped']);
        $this->assertDatabaseHas('lrn_registry', ['lrn' => '222222222222', 'name' => 'FreshA']);
        $this->assertDatabaseHas('lrn_registry', ['name' => 'FreshB (no LRN)', 'lrn' => null]);
    }

    public function test_admin_import_still_rejects_invalid_lrn_when_present(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);

        $csv = $this->csv("lrn,name\nabc,Alice\n12345,Bob\n");

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $csv])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(0, $result['imported']);
        $this->assertSame(2, $result['skipped']);
        $this->assertStringContainsString('LRN must be 12 digits', $result['errors'][0]['reason']);
    }

    public function test_admin_import_blocks_admin_without_school(): void
    {
        $admin = $this->user('school_admin', null);

        $csv = $this->csv("lrn,name\n111111111111,Alice\n");

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $csv])
            ->assertRedirect();

        $this->assertDatabaseMissing('lrn_registry', ['lrn' => '111111111111']);
    }

    // ------------------------------------------------------------------
    //  Spreadsheet-robust import (Excel mangles encoding + long numbers)
    // ------------------------------------------------------------------

    public function test_import_recovers_excel_float_artifact_lrn(): void
    {
        // Excel writes integer LRNs with a trailing ".0" — clean it, don't reject.
        $admin = $this->user('school_admin', $this->schoolA->id);

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $this->csv("lrn,name\n123456789012.0,Juan\n")])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(1, $result['imported']);
        $this->assertDatabaseHas('lrn_registry', ['lrn' => '123456789012', 'name' => 'Juan']);
    }

    public function test_import_strips_excel_text_formula_wrapper_on_lrn(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $this->csv("lrn,name\n=\"123456789012\",Juan\n")])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(1, $result['imported']);
        $this->assertDatabaseHas('lrn_registry', ['lrn' => '123456789012', 'name' => 'Juan']);
    }

    public function test_import_rejects_scientific_notation_lrn_with_guidance(): void
    {
        // A 12-digit LRN that Excel saved as "1.23457E+11" has lost digits, so it
        // can't be recovered — skip it with an actionable reason, never guess.
        $admin = $this->user('school_admin', $this->schoolA->id);

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $this->csv("lrn,name\n1.23457E+11,Juan\n")])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(0, $result['imported']);
        $this->assertSame(1, $result['skipped']);
        $this->assertStringContainsStringIgnoringCase('spreadsheet', $result['errors'][0]['reason']);
        $this->assertDatabaseMissing('lrn_registry', ['name' => 'Juan']);
    }

    public function test_import_transcodes_windows1252_to_utf8(): void
    {
        // Excel saves CSVs as Windows-1252; a name with ñ (byte 0xF1) must import
        // as proper UTF-8 without the admin re-saving the file as "CSV UTF-8".
        $admin = $this->user('school_admin', $this->schoolA->id);

        $win1252 = "lrn,name\n,Pe\xF1a\n"; // "Peña" in Windows-1252
        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $this->csv($win1252)])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(1, $result['imported']);
        $this->assertDatabaseHas('lrn_registry', ['name' => 'Peña']);
    }

    public function test_import_handles_utf8_bom_on_header(): void
    {
        // Excel "Save As CSV UTF-8" prepends a BOM; the first header must still be
        // recognised as "lrn", not "\xEF\xBB\xBFlrn".
        $admin = $this->user('school_admin', $this->schoolA->id);

        $withBom = "\xEF\xBB\xBFlrn,name\n123456789012,Juan\n";
        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $this->csv($withBom)])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(1, $result['imported']);
        $this->assertDatabaseHas('lrn_registry', ['lrn' => '123456789012', 'name' => 'Juan']);
    }

    // ------------------------------------------------------------------
    //  enrollment_status accepts only the four DepEd states
    // ------------------------------------------------------------------

    public function test_import_normalizes_human_enrollment_status_variants(): void
    {
        // "Not Enrolled" (spaces + caps) is accepted and stored as not_enrolled.
        $admin = $this->user('school_admin', $this->schoolA->id);

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $this->csv("lrn,name,enrollment_status\n,Juan,Not Enrolled\n,Pedro,GRADUATED\n")])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(2, $result['imported']);
        $this->assertDatabaseHas('lrn_registry', ['name' => 'Juan', 'enrollment_status' => 'not_enrolled']);
        $this->assertDatabaseHas('lrn_registry', ['name' => 'Pedro', 'enrollment_status' => 'graduated']);
    }

    public function test_import_rejects_invalid_enrollment_status(): void
    {
        // Garbage is no longer silently coerced to enrolled — it's a skipped row.
        $admin = $this->user('school_admin', $this->schoolA->id);

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $this->csv("lrn,name,enrollment_status\n,Juan,expelled\n")])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(0, $result['imported']);
        $this->assertSame(1, $result['skipped']);
        $this->assertStringContainsString('enrollment_status must be one of', $result['errors'][0]['reason']);
        $this->assertDatabaseMissing('lrn_registry', ['name' => 'Juan']);
    }

    public function test_import_blank_enrollment_status_defaults_to_enrolled(): void
    {
        $admin = $this->user('school_admin', $this->schoolA->id);

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $this->csv("lrn,name,enrollment_status\n,Juan,\n")])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(1, $result['imported']);
        $this->assertDatabaseHas('lrn_registry', ['name' => 'Juan', 'enrollment_status' => 'enrolled']);
    }

    // ------------------------------------------------------------------
    //  Super admin no longer has a batch-upload flow
    // ------------------------------------------------------------------

    public function test_admin_import_blocks_super_admin(): void
    {
        $super = $this->user('super_admin', null);

        $csv = $this->csv("lrn,name\n111111111111,Alice\n");

        $this->actingAs($super)
            ->post(route('admin.students.import.store'), ['create_accounts' => '0', 'file' => $csv])
            ->assertForbidden();

        $this->assertDatabaseMissing('lrn_registry', ['lrn' => '111111111111']);
    }

    public function test_super_admin_lrn_registry_routes_no_longer_exist(): void
    {
        $this->assertFalse(\Illuminate\Support\Facades\Route::has('superadmin.lrn-registry.index'));
        $this->assertFalse(\Illuminate\Support\Facades\Route::has('superadmin.lrn-registry.import'));
        $this->assertFalse(\Illuminate\Support\Facades\Route::has('superadmin.lrn-registry.import.store'));
        $this->assertFalse(\Illuminate\Support\Facades\Route::has('superadmin.lrn-registry.update'));
        $this->assertFalse(\Illuminate\Support\Facades\Route::has('superadmin.lrn-registry.destroy'));
    }
}
