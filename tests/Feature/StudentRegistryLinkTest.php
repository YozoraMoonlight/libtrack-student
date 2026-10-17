<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\ReadOnlySessionForLiveRefresh;
use App\Models\LrnRegistry;
use App\Models\School;
use App\Models\User;
use App\Services\RegistryAccountLink;
use App\Support\LoginIdentifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Reported (2026-09-16):
 *  1. School Admin → Users → Edit User doesn't show the student's LRN.
 *  2. School Admin → Students kept a student "Not registered" after they had
 *     an account, until the page was refreshed — and a student registered
 *     without an LRN never showed as registered at all.
 */
class StudentRegistryLinkTest extends TestCase
{
    use RefreshDatabase;

    protected School $school;
    protected School $otherSchool;

    protected function setUp(): void
    {
        parent::setUp();
        $this->school = School::create(['code' => 'LNK', 'name' => 'Link High', 'is_active' => true]);
        $this->otherSchool = School::create(['code' => 'OTH', 'name' => 'Other High', 'is_active' => true]);
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

    /** Manual Register form, as in the screenshot: Mark Prias, no LRN. */
    private function registerMark(User $admin, array $overrides = []): User
    {
        $this->actingAs($admin)
            ->post(route('admin.students.manual-register.store'), array_merge([
                'first_name' => 'Mark Prias',
                'middle_name' => 'CangMawong',
                'last_name' => 'Prias',
                'birthdate' => '2012-11-22',
                'email' => 'mark@gmail.com',
                'phone' => '09657498092',
                'password' => 'Prias2012',
                'grade_level' => 'Grade 8',
            ], $overrides))
            ->assertSessionHasNoErrors();

        return User::where('email', 'mark@gmail.com')->firstOrFail();
    }

    /** @return array<string, mixed> */
    private function editPayload(User $student, array $overrides = []): array
    {
        return array_merge([
            'first_name' => $student->first_name,
            'middle_name' => $student->middle_name,
            'last_name' => $student->last_name,
            'birthdate' => '2012-11-22',
            'email' => $student->email,
            'user_role' => 'user',
            'school_id' => $this->school->id,
            'student_id' => '',
            'phone' => '09657498092',
            'department' => '',
            'password' => '',
            'lrn' => '',
        ], $overrides);
    }

    // ------------------------------------------------------------------
    //  2. "Not registered" for a student who has an account
    // ------------------------------------------------------------------

    public function test_a_student_registered_without_an_lrn_shows_as_registered(): void
    {
        $admin = $this->admin();
        $mark = $this->registerMark($admin);

        $this->assertSame($mark->id, LrnRegistry::where('school_id', $this->school->id)->value('user_id'));

        $this->actingAs($admin)
            ->get(route('admin.students.index'))
            ->assertInertia(fn ($page) => $page
                ->where('students.data.0.is_registered', true)
                ->where('students.data.0.user.email', 'mark@gmail.com'));

        $this->actingAs($admin)
            ->get(route('admin.students.index', ['status' => 'registered']))
            ->assertInertia(fn ($page) => $page->has('students.data', 1));
        $this->actingAs($admin)
            ->get(route('admin.students.index', ['status' => 'unregistered']))
            ->assertInertia(fn ($page) => $page->has('students.data', 0));
    }

    public function test_an_account_created_for_a_roster_lrn_is_linked_to_that_row(): void
    {
        // Self-registration, batch upload and manual register all end in this.
        $row = LrnRegistry::create([
            'lrn' => '108765432114', 'name' => 'Angela Rose Hernandez', 'school_id' => $this->school->id,
            'grade_level' => 'Grade 8', 'enrollment_status' => 'enrolled',
        ]);

        $angela = User::factory()->create([
            'user_role' => 'user', 'lrn' => '108765432114', 'school_id' => $this->school->id, 'email' => 'angela@gmail.com',
        ]);

        $this->assertSame($angela->id, $row->fresh()->user_id);
    }

    public function test_the_students_page_refreshes_on_its_own_when_a_student_gets_an_account(): void
    {
        $admin = $this->admin();
        LrnRegistry::create([
            'lrn' => '108765432113', 'name' => 'Ryan Mark Villanueva', 'school_id' => $this->school->id,
            'grade_level' => 'Grade 8', 'enrollment_status' => 'enrolled',
        ]);

        $refresh = fn () => $this->actingAs($admin)->get(route('admin.students.index'), [
            'X-Inertia' => 'true',
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request()),
            'X-Inertia-Partial-Component' => 'Admin/Students/Index',
            'X-Inertia-Partial-Except' => 'auth,flash,name,quote,ziggy',
            ReadOnlySessionForLiveRefresh::HEADER => '1',
        ]);

        $refresh()->assertOk()->assertJsonPath('props.students.data.0.is_registered', false);

        // The student signs up (any path that creates the account).
        User::factory()->create(['user_role' => 'user', 'lrn' => '108765432113', 'school_id' => $this->school->id]);

        $refresh()->assertOk()->assertJsonPath('props.students.data.0.is_registered', true);
    }

    public function test_enrollment_changes_reach_an_account_that_has_no_lrn(): void
    {
        $admin = $this->admin();
        $mark = $this->registerMark($admin);
        $row = LrnRegistry::where('user_id', $mark->id)->firstOrFail();

        $this->actingAs($admin)
            ->put(route('admin.students.enrollment', $row->id), ['enrollment_status' => 'transferred'])
            ->assertSessionHas('success');

        $this->assertSame('transferred', $mark->fresh()->enrollment_status);
    }

    // ------------------------------------------------------------------
    //  Backfill: rows written before the link existed
    // ------------------------------------------------------------------

    public function test_backfill_links_existing_rows_by_lrn_and_lrn_less_rows_by_name_within_the_school(): void
    {
        // Accounts first, rows second: nothing links on its own.
        $withLrn = User::factory()->create(['user_role' => 'user', 'lrn' => '111122223333', 'school_id' => $this->school->id]);
        $mark = User::factory()->create([
            'user_role' => 'user', 'lrn' => null, 'school_id' => $this->school->id,
            'name' => 'Mark Prias CangMawong Prias', 'birthdate' => '2012-11-22',
        ]);
        $lrnRow = LrnRegistry::create(['lrn' => '111122223333', 'name' => 'With Lrn', 'school_id' => $this->school->id, 'enrollment_status' => 'enrolled']);
        $markRow = LrnRegistry::create(['lrn' => null, 'name' => 'Mark Prias CangMawong Prias', 'birthdate' => '2012-11-22', 'school_id' => $this->school->id, 'enrollment_status' => 'enrolled']);
        $elsewhere = LrnRegistry::create(['lrn' => null, 'name' => 'Mark Prias CangMawong Prias', 'school_id' => $this->otherSchool->id, 'enrollment_status' => 'enrolled']);

        $this->assertSame(2, app(RegistryAccountLink::class)->backfill());

        $this->assertSame($withLrn->id, $lrnRow->fresh()->user_id);
        $this->assertSame($mark->id, $markRow->fresh()->user_id);
        $this->assertNull($elsewhere->fresh()->user_id, 'A same-named student at another school is someone else.');
    }

    public function test_backfill_leaves_ambiguous_or_mismatched_rows_alone(): void
    {
        foreach (['twin1@x.io', 'twin2@x.io'] as $email) {
            User::factory()->create(['user_role' => 'user', 'lrn' => null, 'school_id' => $this->school->id, 'name' => 'Juan Santos', 'email' => $email]);
        }
        User::factory()->create(['user_role' => 'user', 'lrn' => null, 'school_id' => $this->school->id, 'name' => 'Ana Cruz', 'birthdate' => '2010-01-01']);

        $twins = LrnRegistry::create(['lrn' => null, 'name' => 'Juan Santos', 'school_id' => $this->school->id, 'enrollment_status' => 'enrolled']);
        $wrongBirthday = LrnRegistry::create(['lrn' => null, 'name' => 'Ana Cruz', 'birthdate' => '2011-05-05', 'school_id' => $this->school->id, 'enrollment_status' => 'enrolled']);

        $this->assertSame(0, app(RegistryAccountLink::class)->backfill());
        $this->assertNull($twins->fresh()->user_id);
        $this->assertNull($wrongBirthday->fresh()->user_id);
    }

    // ------------------------------------------------------------------
    //  1. LRN on Edit User
    // ------------------------------------------------------------------

    public function test_the_edit_user_page_shows_the_students_lrn(): void
    {
        $student = User::factory()->create(['user_role' => 'user', 'lrn' => '108765432111', 'school_id' => $this->school->id]);

        $this->actingAs($this->admin())
            ->get(route('admin.users.edit', $student))
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Users/Edit')
                ->where('user.lrn', '108765432111'));
    }

    public function test_a_school_admin_can_add_an_lrn_to_a_student_registered_without_one(): void
    {
        $admin = $this->admin();
        $mark = $this->registerMark($admin);

        $this->actingAs($admin)
            ->put(route('admin.users.update', $mark), $this->editPayload($mark, ['lrn' => '123456789012']))
            ->assertSessionHasNoErrors();

        $this->assertSame('123456789012', $mark->fresh()->lrn);
        $row = LrnRegistry::where('user_id', $mark->id)->firstOrFail();
        $this->assertSame('123456789012', $row->lrn);
        $this->assertSame(1, LrnRegistry::where('school_id', $this->school->id)->count());

        // ...and they can now sign in with it.
        $this->assertSame('mark@gmail.com', LoginIdentifier::credentials('123456789012', 'Prias2012')['email']);

        $this->actingAs($admin)
            ->get(route('admin.students.index'))
            ->assertInertia(fn ($page) => $page
                ->where('students.data.0.lrn', '123456789012')
                ->where('students.data.0.is_registered', true));
    }

    public function test_an_lrn_already_on_the_roster_takes_over_the_placeholder_row(): void
    {
        $admin = $this->admin();
        // Roster uploaded earlier with the LRN; the student was then registered by hand without it.
        $roster = LrnRegistry::create([
            'lrn' => '108765432112', 'name' => 'Mark Prias CangMawong Prias', 'school_id' => $this->school->id,
            'grade_level' => 'Grade 9', 'section' => 'Mabini', 'enrollment_status' => 'enrolled',
        ]);
        $mark = $this->registerMark($admin);
        $this->assertSame(2, LrnRegistry::where('school_id', $this->school->id)->count());

        $this->actingAs($admin)
            ->put(route('admin.users.update', $mark), $this->editPayload($mark, ['lrn' => '108765432112']))
            ->assertSessionHasNoErrors();

        $this->assertSame(1, LrnRegistry::where('school_id', $this->school->id)->count(), 'No duplicate student left on the list.');
        $this->assertSame($mark->id, $roster->fresh()->user_id);
        $this->assertSame('Grade 9', $roster->fresh()->grade_level, "The roster's own placement is kept.");
        $this->assertSame('108765432112', $mark->fresh()->lrn);
    }

    public function test_an_lrn_from_another_school_is_refused(): void
    {
        $admin = $this->admin();
        $mark = $this->registerMark($admin);
        LrnRegistry::create(['lrn' => '999988887777', 'name' => 'Someone Else', 'school_id' => $this->otherSchool->id, 'enrollment_status' => 'enrolled']);

        $this->actingAs($admin)
            ->put(route('admin.users.update', $mark), $this->editPayload($mark, ['lrn' => '999988887777', 'phone' => '09170000001']))
            ->assertSessionHasErrors('lrn');

        $this->assertNull($mark->fresh()->lrn);
        $this->assertSame('09657498092', $mark->fresh()->phone, 'Nothing else was saved either.');
    }

    public function test_an_lrn_already_registered_to_another_student_is_refused(): void
    {
        $admin = $this->admin();
        $mark = $this->registerMark($admin);
        User::factory()->create(['user_role' => 'user', 'lrn' => '555566667777', 'school_id' => $this->school->id]);

        $this->actingAs($admin)
            ->put(route('admin.users.update', $mark), $this->editPayload($mark, ['lrn' => '555566667777']))
            ->assertSessionHasErrors('lrn');

        $this->assertNull($mark->fresh()->lrn);
    }

    public function test_an_lrn_must_be_twelve_digits(): void
    {
        $admin = $this->admin();
        $mark = $this->registerMark($admin);

        $this->actingAs($admin)
            ->put(route('admin.users.update', $mark), $this->editPayload($mark, ['lrn' => '12345']))
            ->assertSessionHasErrors('lrn');
    }

    public function test_clearing_the_lrn_keeps_the_student_registered(): void
    {
        $admin = $this->admin();
        $mark = $this->registerMark($admin, ['lrn' => '121212121212']);

        $this->actingAs($admin)
            ->put(route('admin.users.update', $mark), $this->editPayload($mark, ['lrn' => '']))
            ->assertSessionHasNoErrors();

        $this->assertNull($mark->fresh()->lrn);
        $this->actingAs($admin)
            ->get(route('admin.students.index'))
            ->assertInertia(fn ($page) => $page->where('students.data.0.is_registered', true));
    }
}
