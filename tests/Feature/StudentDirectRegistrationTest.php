<?php

namespace Tests\Feature;

use App\Models\LrnRegistry;
use App\Models\School;
use App\Models\User;
use App\Support\GradeLevels;
use App\Support\LoginIdentifier;
use App\Support\StudentCredentials;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Coverage for the two student-registration changes:
 *
 *  1. Batch upload registers accounts directly (not just registry rows), with a
 *     fixed grade-level list and a page-level Grade Level picker.
 *  2. Manual registration takes a birthdate, and the default password is
 *     SURNAME + BIRTH YEAR (e.g. Montenegro2005).
 *
 * Plus the login change those depend on: students sign in with LRN or email.
 */
class StudentDirectRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected School $school;

    protected function setUp(): void
    {
        parent::setUp();
        $this->school = School::create(['code' => 'REG', 'name' => 'Registration High', 'is_active' => true]);
    }

    private function admin(): User
    {
        return User::factory()->create([
            'user_role' => 'school_admin',
            'is_active' => true,
            'school_id' => $this->school->id,
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
    //  Password derivation
    // ------------------------------------------------------------------

    public function test_password_is_surname_plus_birth_year(): void
    {
        $this->assertSame('Montenegro2005', StudentCredentials::derivePassword('Montenegro', '2005-04-12'));
        $this->assertSame('Delacruz2010', StudentCredentials::derivePassword('dela cruz', '2010-12-31'));
        $this->assertSame('Obrien2008', StudentCredentials::derivePassword("O'Brien", '2008-01-01'));
    }

    public function test_password_derivation_needs_both_parts(): void
    {
        $this->assertNull(StudentCredentials::derivePassword('', '2005-04-12'));
        $this->assertNull(StudentCredentials::derivePassword('Montenegro', ''));
        $this->assertNull(StudentCredentials::derivePassword('Montenegro', 'not-a-date'));
    }

    public function test_birthdate_parser_handles_spreadsheet_formats(): void
    {
        $this->assertSame('2005-04-12', StudentCredentials::parseBirthdate('2005-04-12')->toDateString());
        $this->assertSame('2005-04-12', StudentCredentials::parseBirthdate('12/04/2005')->toDateString());
        $this->assertNull(StudentCredentials::parseBirthdate('9999-99-99'));
        // A future date can't be a birthdate.
        $this->assertNull(StudentCredentials::parseBirthdate(now()->addYear()->toDateString()));
    }

    // ------------------------------------------------------------------
    //  Grade levels
    // ------------------------------------------------------------------

    public function test_grade_level_normalisation(): void
    {
        $this->assertSame('Grade 7', GradeLevels::normalize('grade 7'));
        $this->assertSame('Grade 7', GradeLevels::normalize('7'));
        $this->assertSame('Grade 10', GradeLevels::normalize('G10'));
        $this->assertNull(GradeLevels::normalize('Kinder'));
        $this->assertNull(GradeLevels::normalize('Grade 99'));
    }

    // ------------------------------------------------------------------
    //  Batch upload — direct registration
    // ------------------------------------------------------------------

    public function test_batch_upload_creates_student_accounts_with_derived_passwords(): void
    {
        $admin = $this->admin();

        $csv = $this->csv(
            "lrn,first_name,middle_name,last_name,birthdate,grade_level,section\n" .
            "111111111111,Juan,Santos,Montenegro,2005-04-12,Grade 7,Mabini\n" .
            "222222222222,Pedro,,Reyes,2006-09-30,Grade 8,Rizal\n"
        );

        $this->actingAs($admin)
            ->post(route('admin.students.import.store'), ['file' => $csv])
            ->assertRedirect();

        $result = session('import_result');
        $this->assertSame(2, $result['imported']);
        $this->assertSame(2, $result['registered']);
        $this->assertSame(0, $result['skipped'], json_encode($result['errors']));

        // Registry row AND a real account.
        $this->assertDatabaseHas('lrn_registry', ['lrn' => '111111111111', 'grade_level' => 'Grade 7']);
        $juan = User::where('lrn', '111111111111')->first();
        $this->assertNotNull($juan);
        $this->assertSame('Juan Santos Montenegro', $juan->name);
        $this->assertSame('user', $juan->user_role);
        $this->assertSame($this->school->id, $juan->school_id);
        $this->assertTrue((bool) $juan->is_active);

        // The password is genuinely usable.
        $this->assertTrue(Hash::check('Montenegro2005', $juan->password));
        $this->assertTrue(Hash::check('Reyes2006', User::where('lrn', '222222222222')->first()->password));
    }

    public function test_batch_upload_returns_credentials_for_handout(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,Montenegro,2005-04-12\n"),
        ])->assertRedirect();

        $creds = session('import_result')['credentials'];
        $this->assertCount(1, $creds);
        $this->assertSame('Montenegro2005', $creds[0]['password']);
        $this->assertSame('111111111111@' . StudentCredentials::PLACEHOLDER_DOMAIN, $creds[0]['email']);
        $this->assertTrue($creds[0]['generated_email']);
    }

    public function test_batch_upload_uses_a_supplied_email_when_present(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate,email\n111111111111,Juan,Montenegro,2005-04-12,juan@gmail.com\n"),
        ])->assertRedirect();

        $this->assertSame('juan@gmail.com', User::where('lrn', '111111111111')->value('email'));
        $this->assertFalse(session('import_result')['credentials'][0]['generated_email']);
    }

    public function test_batch_upload_generates_unique_emails_for_students_without_an_lrn(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv(
                "lrn,first_name,last_name,birthdate\n" .
                ",Maria,Cruz,2007-01-05\n" .
                ",Maria,Cruz,2008-02-06\n"
            ),
        ])->assertRedirect();

        $result = session('import_result');
        // Second row is a name-duplicate within the school, so it is skipped —
        // the point here is that the first one got a working generated address.
        $emails = User::where('school_id', $this->school->id)->where('user_role', 'user')->pluck('email');
        $this->assertSame($emails->count(), $emails->unique()->count());
        $this->assertStringContainsString(StudentCredentials::PLACEHOLDER_DOMAIN, $emails->first());
        $this->assertSame(1, $result['registered']);
    }

    public function test_a_row_with_no_birthdate_still_reaches_the_registry_but_gets_no_account(): void
    {
        // A missing birthdate must cost the row its LOGIN, not its roster entry —
        // otherwise an old template with no birthdate column would import nothing
        // at all while still reporting success.
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,Montenegro,\n"),
        ])->assertRedirect();

        $result = session('import_result');
        $this->assertSame(1, $result['imported']);
        $this->assertSame(0, $result['registered']);
        $this->assertSame(0, $result['skipped']);
        $this->assertStringContainsString('birthdate is missing', $result['errors'][0]['reason']);
        $this->assertDatabaseHas('lrn_registry', ['lrn' => '111111111111']);
        $this->assertDatabaseMissing('users', ['lrn' => '111111111111']);
    }

    public function test_a_legacy_template_with_no_birthdate_column_still_imports(): void
    {
        // Regression for the exact template the app used to ship.
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv(
                "lrn,first_name,middle_name,last_name,grade_level,section,enrollment_status\n" .
                "123456789012,Juan,Santos,Cruz,Grade 7,Mabini,enrolled\n" .
                "123456789013,Pedro,,Reyes,Grade 8,Rizal,enrolled\n"
            ),
        ])->assertRedirect();

        $result = session('import_result');
        $this->assertSame(2, $result['imported']);
        $this->assertSame(0, $result['registered']);
        $this->assertSame(0, $result['skipped']);
        $this->assertDatabaseHas('lrn_registry', ['lrn' => '123456789012', 'grade_level' => 'Grade 7']);
        $this->assertDatabaseHas('lrn_registry', ['lrn' => '123456789013', 'grade_level' => 'Grade 8']);
    }

    public function test_a_student_already_on_the_roster_can_still_be_registered(): void
    {
        // THE CASE EVERY EXISTING SCHOOL HITS: the roster was uploaded before
        // direct registration existed, so every LRN is already in the registry.
        // Re-uploading with birthdates must create the missing accounts.
        $admin = $this->admin();

        LrnRegistry::create([
            'lrn' => '111111111111',
            'name' => 'Juan Montenegro',
            'first_name' => 'Juan',
            'last_name' => 'Montenegro',
            'school_id' => $this->school->id,
            'enrollment_status' => 'enrolled',
        ]);

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,Montenegro,2005-04-12\n"),
        ])->assertRedirect();

        $result = session('import_result');
        $this->assertSame(1, $result['registered'], json_encode($result['errors']));
        $this->assertSame(0, $result['skipped']);
        // The duplicate roster row is not re-added, and is not reported as an
        // error because the row achieved what was asked of it.
        $this->assertSame(0, $result['imported']);
        $this->assertSame([], $result['errors']);

        $user = User::where('lrn', '111111111111')->first();
        $this->assertNotNull($user);
        $this->assertTrue(Hash::check('Montenegro2005', $user->password));
        // The birthdate is backfilled onto the existing roster row too.
        $this->assertSame('2005-04-12', LrnRegistry::where('lrn', '111111111111')->first()->birthdate->toDateString());
    }

    public function test_a_cross_school_lrn_is_never_registered(): void
    {
        $other = School::create(['code' => 'OTH', 'name' => 'Other High', 'is_active' => true]);
        LrnRegistry::create([
            'lrn' => '111111111111',
            'name' => 'Someone Else',
            'school_id' => $other->id,
            'enrollment_status' => 'enrolled',
        ]);

        $this->actingAs($this->admin())->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,Montenegro,2005-04-12\n"),
        ])->assertRedirect();

        $result = session('import_result');
        $this->assertSame(0, $result['registered']);
        $this->assertSame(1, $result['skipped']);
        $this->assertStringContainsString('Contact super admin', $result['errors'][0]['reason']);
        $this->assertDatabaseMissing('users', ['lrn' => '111111111111']);
    }

    public function test_a_student_who_already_has_an_account_is_not_duplicated(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,Montenegro,2005-04-12\n"),
        ])->assertRedirect();
        $this->assertSame(1, session('import_result')['registered']);

        // Same file again.
        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,Montenegro,2005-04-12\n"),
        ])->assertRedirect();

        $second = session('import_result');
        $this->assertSame(0, $second['registered']);
        $this->assertSame(1, $second['skipped']);
        $this->assertSame(1, User::where('lrn', '111111111111')->count());
    }

    public function test_batch_upload_rejects_an_unparseable_birthdate(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,Montenegro,not-a-date\n"),
        ])->assertRedirect();

        $this->assertStringContainsString('could not be read', session('import_result')['errors'][0]['reason']);
    }

    public function test_batch_upload_rejects_a_grade_level_outside_the_list(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate,grade_level\n111111111111,Juan,Montenegro,2005-04-12,Kinder\n"),
        ])->assertRedirect();

        $result = session('import_result');
        $this->assertSame(1, $result['skipped']);
        $this->assertStringContainsString('grade_level must be one of', $result['errors'][0]['reason']);
    }

    public function test_batch_upload_normalises_a_loose_grade_level(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate,grade_level\n111111111111,Juan,Montenegro,2005-04-12,grade 7\n"),
        ])->assertRedirect();

        $this->assertDatabaseHas('lrn_registry', ['lrn' => '111111111111', 'grade_level' => 'Grade 7']);
    }

    public function test_page_grade_level_fills_blank_cells(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv(
                "lrn,first_name,last_name,birthdate,grade_level\n" .
                "111111111111,Juan,Montenegro,2005-04-12,\n" .
                "222222222222,Pedro,Reyes,2006-09-30,Grade 9\n"
            ),
            'default_grade' => 'Grade 7',
        ])->assertRedirect();

        $this->assertDatabaseHas('lrn_registry', ['lrn' => '111111111111', 'grade_level' => 'Grade 7']);
        // The CSV value wins when the cell is filled and override is off.
        $this->assertDatabaseHas('lrn_registry', ['lrn' => '222222222222', 'grade_level' => 'Grade 9']);
    }

    public function test_override_grade_applies_to_every_row(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv(
                "lrn,first_name,last_name,birthdate,grade_level\n" .
                "111111111111,Juan,Montenegro,2005-04-12,Grade 9\n" .
                "222222222222,Pedro,Reyes,2006-09-30,Grade 10\n"
            ),
            'default_grade' => 'Grade 7',
            'override_grade' => '1',
        ])->assertRedirect();

        $this->assertDatabaseHas('lrn_registry', ['lrn' => '111111111111', 'grade_level' => 'Grade 7']);
        $this->assertDatabaseHas('lrn_registry', ['lrn' => '222222222222', 'grade_level' => 'Grade 7']);
    }

    public function test_override_without_a_grade_is_rejected(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->from(route('admin.students.import'))
            ->post(route('admin.students.import.store'), [
                'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,Montenegro,2005-04-12\n"),
                'override_grade' => '1',
            ])
            ->assertSessionHasErrors('default_grade');
    }

    public function test_an_invalid_page_grade_level_is_rejected(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->from(route('admin.students.import'))
            ->post(route('admin.students.import.store'), [
                'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,Montenegro,2005-04-12\n"),
                'default_grade' => 'Kinder',
            ])
            ->assertSessionHasErrors('default_grade');
    }

    public function test_batch_upload_skips_an_lrn_that_already_has_an_account(): void
    {
        $admin = $this->admin();
        User::factory()->create([
            'user_role' => 'user',
            'lrn' => '111111111111',
            'school_id' => $this->school->id,
        ]);

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,Montenegro,2005-04-12\n"),
        ])->assertRedirect();

        $result = session('import_result');
        $this->assertSame(0, $result['registered']);
        $this->assertStringContainsString('already exists', $result['errors'][0]['reason']);
    }

    public function test_registry_only_upload_creates_no_accounts(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name\n111111111111,Juan,Montenegro\n"),
            'create_accounts' => '0',
        ])->assertRedirect();

        $this->assertDatabaseHas('lrn_registry', ['lrn' => '111111111111']);
        $this->assertDatabaseMissing('users', ['lrn' => '111111111111']);
        $this->assertSame(0, session('import_result')['registered']);
    }

    // ------------------------------------------------------------------
    //  Manual registration
    // ------------------------------------------------------------------

    public function test_manual_register_stores_the_birthdate(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.manual-register.store'), [
            'first_name' => 'Jose',
            'last_name' => 'Montenegro',
            'birthdate' => '2005-04-12',
            'lrn' => '333333333333',
            'email' => 'jose@test.io',
            'phone' => '09171234500',
            'grade_level' => 'Grade 7',
            'password' => 'Montenegro2005',
        ])->assertRedirect(route('admin.students.index'));

        $user = User::where('email', 'jose@test.io')->first();
        $this->assertSame('2005-04-12', $user->birthdate->toDateString());
        $this->assertTrue(Hash::check('Montenegro2005', $user->password));
        $this->assertSame('2005-04-12', LrnRegistry::where('lrn', '333333333333')->first()->birthdate->toDateString());
    }

    /**
     * The LRN box on the manual-register form is a field, not just a lookup:
     * whatever is typed there is what the student is filed and signs in under,
     * whether or not the DepEd registry has ever heard of them.
     */
    public function test_a_typed_lrn_is_saved_on_both_the_account_and_the_registry(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.manual-register.store'), [
            'first_name' => 'Maria',
            'last_name' => 'Cruz',
            'birthdate' => '2010-02-08',
            'lrn' => '444444444444',
            'email' => 'maria.cruz@test.io',
            'phone' => '09171234501',
            'password' => 'Cruz2010',
        ])->assertRedirect(route('admin.students.index'));

        $user = User::where('email', 'maria.cruz@test.io')->first();
        $this->assertSame('444444444444', $user->lrn);
        // The LRN doubles as the student number they are looked up by.
        $this->assertSame('444444444444', $user->student_id);
        $this->assertDatabaseHas('lrn_registry', [
            'lrn' => '444444444444',
            'name' => 'Maria Cruz',
            'school_id' => $this->school->id,
        ]);
    }

    public function test_the_same_lrn_cannot_be_registered_twice(): void
    {
        $admin = $this->admin();
        $payload = [
            'first_name' => 'Maria',
            'last_name' => 'Cruz',
            'birthdate' => '2010-02-08',
            'lrn' => '555555555555',
            'email' => 'maria.one@test.io',
            'phone' => '09171234502',
            'password' => 'Cruz2010',
        ];

        $this->actingAs($admin)->post(route('admin.students.manual-register.store'), $payload);

        $this->actingAs($admin)
            ->from(route('admin.students.manual-register'))
            ->post(route('admin.students.manual-register.store'), array_merge($payload, [
                'email' => 'maria.two@test.io',
            ]))
            ->assertSessionHasErrors('lrn');

        $this->assertDatabaseMissing('users', ['email' => 'maria.two@test.io']);
    }

    public function test_manual_register_requires_a_birthdate(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->from(route('admin.students.manual-register'))
            ->post(route('admin.students.manual-register.store'), [
                'first_name' => 'Jose',
                'last_name' => 'Montenegro',
                'email' => 'jose2@test.io',
                'phone' => '09171234500',
                'password' => 'Montenegro2005',
            ])
            ->assertSessionHasErrors('birthdate');

        $this->assertDatabaseMissing('users', ['email' => 'jose2@test.io']);
    }

    public function test_manual_register_rejects_a_future_birthdate(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->from(route('admin.students.manual-register'))
            ->post(route('admin.students.manual-register.store'), [
                'first_name' => 'Jose',
                'last_name' => 'Montenegro',
                'birthdate' => now()->addDay()->toDateString(),
                'email' => 'jose3@test.io',
                'phone' => '09171234500',
                'password' => 'Montenegro2005',
            ])
            ->assertSessionHasErrors('birthdate');
    }

    public function test_manual_register_rejects_a_grade_outside_the_list(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->from(route('admin.students.manual-register'))
            ->post(route('admin.students.manual-register.store'), [
                'first_name' => 'Jose',
                'last_name' => 'Montenegro',
                'birthdate' => '2005-04-12',
                'email' => 'jose4@test.io',
                'phone' => '09171234500',
                'grade_level' => 'Kinder',
                'password' => 'Montenegro2005',
            ])
            ->assertSessionHasErrors('grade_level');
    }

    public function test_manual_register_still_rejects_a_password_with_no_digits(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->from(route('admin.students.manual-register'))
            ->post(route('admin.students.manual-register.store'), [
                'first_name' => 'Jose',
                'last_name' => 'Montenegro',
                'birthdate' => '2005-04-12',
                'email' => 'jose5@test.io',
                'phone' => '09171234500',
                'password' => 'Montenegro',
            ])
            ->assertSessionHasErrors('password');
    }

    public function test_the_import_result_reaches_the_import_page(): void
    {
        // Regression: `import_result` was flashed to the session but never
        // shared with Inertia, so the result table silently rendered nothing.
        $admin = $this->admin();

        $this->actingAs($admin)
            ->from(route('admin.students.import'))
            ->post(route('admin.students.import.store'), [
                'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,Montenegro,2005-04-12\n"),
            ])
            ->assertRedirect(route('admin.students.import'));

        $this->actingAs($admin)
            ->get(route('admin.students.import'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Students/Import')
                ->where('flash.import_result.registered', 1)
                ->where('flash.import_result.credentials.0.password', 'Montenegro2005')
                ->has('gradeLevels')
            );
    }

    public function test_the_plaintext_logins_are_never_shared_with_another_page(): void
    {
        // The result payload carries plaintext default passwords, so it must be
        // scoped to the import screen rather than handed to whichever page
        // happens to load next.
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,Montenegro,2005-04-12\n"),
        ]);

        $response = $this->actingAs($admin)->get(route('admin.students.index'));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->where('flash.import_result', null));
        $response->assertDontSee('Montenegro2005');
    }

    // ------------------------------------------------------------------
    //  Login with LRN or email
    // ------------------------------------------------------------------

    public function test_a_batch_registered_student_can_log_in_with_their_lrn(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,Montenegro,2005-04-12\n"),
        ]);

        $this->post('/student/login', ['email' => '111111111111', 'password' => 'Montenegro2005'])
            ->assertRedirect();
        $this->assertAuthenticated();
        $this->assertSame('111111111111', auth()->user()->lrn);
    }

    public function test_the_generated_email_also_works(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,Montenegro,2005-04-12\n"),
        ]);
        auth()->logout();

        $this->post('/student/login', [
            'email' => '111111111111@' . StudentCredentials::PLACEHOLDER_DOMAIN,
            'password' => 'Montenegro2005',
        ])->assertRedirect();
        $this->assertAuthenticated();
    }

    public function test_a_wrong_password_with_a_valid_lrn_is_rejected(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,Montenegro,2005-04-12\n"),
        ]);
        auth()->logout();

        $this->from('/student/login')
            ->post('/student/login', ['email' => '111111111111', 'password' => 'wrong'])
            ->assertSessionHasErrors('auth');
        $this->assertGuest();
    }

    public function test_an_unknown_lrn_gives_the_same_generic_error(): void
    {
        // Must not leak whether an LRN exists.
        $this->from('/student/login')
            ->post('/student/login', ['email' => '999999999999', 'password' => 'whatever'])
            ->assertSessionHasErrors('auth');
        $this->assertGuest();
    }

    public function test_batch_upload_refuses_a_surname_too_short_for_a_password(): void
    {
        // "N" + "2005" is five characters, below the six-character minimum the
        // manual form enforces — so the importer must refuse rather than hand
        // out a credential the app itself would reject.
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,N,2005-04-12\n"),
        ])->assertRedirect();

        $result = session('import_result');
        $this->assertSame(0, $result['registered']);
        $this->assertStringContainsString('at least two letters', $result['errors'][0]['reason']);
        $this->assertDatabaseMissing('users', ['lrn' => '111111111111']);
    }

    public function test_batch_upload_handles_a_surname_with_no_ascii_letters(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,---,2005-04-12\n"),
        ])->assertRedirect();

        $result = session('import_result');
        $this->assertSame(0, $result['registered']);
        // The roster row still lands; only the login can't be issued.
        $this->assertSame(1, $result['imported']);
        $this->assertDatabaseMissing('users', ['lrn' => '111111111111']);
    }

    public function test_accented_surnames_transliterate_rather_than_lose_letters(): void
    {
        // "Nuñez" used to become "Nuez2007", so the documented rule
        // (surname + birth year) produced a password that did not work.
        $this->assertSame('Nunez2007', StudentCredentials::derivePassword('Nuñez', '2007-01-05'));
        $this->assertSame('Jose2005', StudentCredentials::derivePassword('José', '2005-01-05'));

        $admin = $this->admin();
        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Ana,Nuñez,2007-01-05\n"),
        ])->assertRedirect();

        $this->assertSame('Nunez2007', session('import_result')['credentials'][0]['password']);
        $this->assertTrue(Hash::check('Nunez2007', User::where('lrn', '111111111111')->first()->password));
    }

    public function test_a_bare_birth_year_is_rejected_not_read_as_today(): void
    {
        // strtotime reads "2005" as 20:05 today; that used to be accepted and
        // written as the student's birthdate.
        $this->assertNull(StudentCredentials::parseBirthdate('2005'));

        $admin = $this->admin();
        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,Montenegro,2005\n"),
        ])->assertRedirect();

        $result = session('import_result');
        $this->assertSame(0, $result['registered']);
        $this->assertStringContainsString('could not be read', $result['errors'][0]['reason']);
        $this->assertNull(LrnRegistry::where('lrn', '111111111111')->first()?->birthdate);
    }

    public function test_a_two_letter_surname_still_works(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->post(route('admin.students.import.store'), [
            'file' => $this->csv("lrn,first_name,last_name,birthdate\n111111111111,Juan,Sy,2005-04-12\n"),
        ])->assertRedirect();

        $this->assertSame(1, session('import_result')['registered']);
        $this->assertTrue(Hash::check('Sy2005', User::where('lrn', '111111111111')->first()->password));
    }

    public function test_an_unknown_lrn_costs_the_same_time_as_a_wrong_password(): void
    {
        // Returning early for an unknown LRN skipped bcrypt entirely, and the
        // response-time gap made the login box an LRN oracle.
        //
        // Tests run at bcrypt cost 4 (~1ms), where scheduler noise dwarfs the
        // signal — so this raises the work factor to make the difference, if any,
        // unmistakable.
        config(['hashing.bcrypt.rounds' => 10]);

        $known = '111111111111';
        $unknown = '999999999999';

        User::factory()->create([
            'user_role' => 'user',
            'lrn' => $known,
            'school_id' => $this->school->id,
            'is_active' => true,
            'password' => Hash::make('Montenegro2005'),
        ]);

        $measure = function (string $lrn): float {
            $start = microtime(true);
            LoginIdentifier::credentials($lrn, 'definitely-wrong-password');

            return microtime(true) - $start;
        };

        // Warm up (autoloading, first bcrypt call, the memoised dummy hash).
        $measure($known);
        $measure($unknown);

        $knownTime = min($measure($known), $measure($known), $measure($known));
        $unknownTime = min($measure($unknown), $measure($unknown), $measure($unknown));

        // The unknown-LRN path must still do real hashing work.
        $this->assertGreaterThan(
            $knownTime * 0.5,
            $unknownTime,
            'An unknown LRN returned far faster than a known one — that gap leaks which LRNs exist.',
        );
        $this->assertNull(LoginIdentifier::credentials($unknown, 'x'));
    }

    public function test_a_school_admin_cannot_look_up_another_schools_student(): void
    {
        // The lookup response now includes birthdate, which is half of the
        // student's default password.
        $other = School::create(['code' => 'FAR', 'name' => 'Far High', 'is_active' => true]);
        LrnRegistry::create([
            'lrn' => '777777777777',
            'name' => 'Not Yours',
            'first_name' => 'Not',
            'last_name' => 'Yours',
            'birthdate' => '2006-06-06',
            'school_id' => $other->id,
            'enrollment_status' => 'enrolled',
        ]);

        $this->actingAs($this->admin())
            ->getJson(route('admin.lrn.lookup') . '?lrn=777777777777')
            ->assertNotFound()
            ->assertJsonPath('ok', false);
    }

    public function test_a_school_admin_can_look_up_their_own_student_with_birthdate(): void
    {
        LrnRegistry::create([
            'lrn' => '888888888888',
            'name' => 'Mine Student',
            'first_name' => 'Mine',
            'last_name' => 'Student',
            'birthdate' => '2006-06-06',
            'school_id' => $this->school->id,
            'enrollment_status' => 'enrolled',
        ]);

        $this->actingAs($this->admin())
            ->getJson(route('admin.lrn.lookup') . '?lrn=888888888888')
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('birthdate', '2006-06-06');
    }

    public function test_a_csv_with_the_wrong_headers_reports_cleanly_instead_of_erroring(): void
    {
        // The missing-headers early return used to omit `registered`, so the
        // controller blew up with "Undefined array key" instead of telling the
        // admin their columns were wrong.
        $this->actingAs($this->admin())
            ->post(route('admin.students.import.store'), [
                'file' => $this->csv("wrong,headers\nfoo,bar\n"),
            ])
            ->assertRedirect()
            ->assertSessionHasNoErrors();

        $result = session('import_result');
        $this->assertSame(0, $result['imported']);
        $this->assertSame(0, $result['registered']);
        $this->assertSame([], $result['credentials']);
        $this->assertStringContainsString('Missing required columns', $result['errors'][0]['reason']);
    }
}
