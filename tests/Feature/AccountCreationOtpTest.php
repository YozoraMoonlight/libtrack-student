<?php

namespace Tests\Feature;

use App\Models\LrnRegistry;
use App\Models\School;
use App\Models\Section;
use App\Models\User;
use App\Services\OtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Mockery\MockInterface;
use Tests\TestCase;

/**
 * Accounts created on someone else's behalf are confirmed by SMS first.
 *
 * The rule under test is the same for all three flows: the submit button sends
 * a code and writes NOTHING; the row appears only when that code comes back.
 *
 * OtpService itself is stubbed — a real code is a random six digits stored as a
 * hash, which a test cannot read back. What matters here is the wiring around
 * it: no write before verification, one write after, and none on a bad code.
 */
class AccountCreationOtpTest extends TestCase
{
    use RefreshDatabase;

    private const GOOD_CODE = '123456';

    protected School $school;

    protected function setUp(): void
    {
        parent::setUp();

        $this->school = School::create(['code' => 'OTP', 'name' => 'OTP High', 'is_active' => true]);

        // The suite runs with ACCOUNT_OTP_ENABLED=false; this file is the one
        // that turns the confirmation step on.
        config(['services.account_otp.enabled' => true]);

        $this->mock(OtpService::class, function (MockInterface $mock) {
            $mock->shouldReceive('issue')->andReturn([
                'id' => 1,
                'sent' => true,
                'expires_at' => now()->addMinutes(10),
                'debug_code' => null,
            ]);
            $mock->shouldReceive('verify')->andReturnUsing(
                fn ($otpId, $phone, $code, $purpose = 'registration') => $code === self::GOOD_CODE
                    ? ['ok' => true]
                    : ['ok' => false, 'error' => 'Incorrect verification code.']
            );
        });
    }

    private function superAdmin(): User
    {
        return User::factory()->create([
            'user_role' => 'super_admin',
            'is_active' => true,
            'school_id' => null,
            'password' => Hash::make('Password1!'),
            'phone' => '09171234500',
        ]);
    }

    private function schoolAdmin(): User
    {
        return User::factory()->create([
            'user_role' => 'school_admin',
            'is_active' => true,
            'school_id' => $this->school->id,
            'password' => Hash::make('Password1!'),
            'phone' => '09171234501',
        ]);
    }

    /** @return array<string, mixed> */
    private function schoolAdminPayload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Albert',
            'middle_name' => 'Santiago',
            'last_name' => 'Palao',
            'email' => 'albert.palao@example.com',
            'phone' => '09557267615',
            'school_id' => $this->school->id,
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ], $overrides);
    }

    /** @return array<string, mixed> */
    private function librarianPayload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Yrica',
            'last_name' => 'Secuya',
            'email' => 'yrica@example.com',
            'phone' => '09171239999',
            'user_role' => 'librarian',
            'school_id' => $this->school->id,
            'password' => 'Password1!',
            'password_confirmation' => 'Password1!',
        ], $overrides);
    }

    /** @return array<string, mixed> */
    private function studentPayload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Juan',
            'last_name' => 'Montenegro',
            'birthdate' => '2005-04-12',
            'email' => 'juan.montenegro@example.com',
            'phone' => '09171234567',
            'password' => 'Montenegro2005',
        ], $overrides);
    }

    // ------------------------------------------------------------------
    //  Super admin → school admin
    // ------------------------------------------------------------------

    public function test_creating_a_school_admin_sends_a_code_and_writes_nothing_yet(): void
    {
        $this->actingAs($this->superAdmin())
            ->post(route('superadmin.school-admins.store'), $this->schoolAdminPayload())
            ->assertRedirect(route('superadmin.school-admins.create'));

        $this->assertDatabaseMissing('users', ['email' => 'albert.palao@example.com']);
    }

    public function test_the_create_page_then_shows_the_pending_confirmation(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)->post(route('superadmin.school-admins.store'), $this->schoolAdminPayload());

        $this->actingAs($admin)
            ->get(route('superadmin.school-admins.create'))
            ->assertInertia(fn ($page) => $page
                ->component('SuperAdmin/SchoolAdmins/Create')
                ->where('otpPending.summary', 'Albert Santiago Palao (School Admin)')
                // Masked, never the full number.
                ->where('otpPending.phone_masked', fn ($masked) => str_contains((string) $masked, '•')
                    && !str_contains((string) $masked, '09557267615'))
                ->etc());
    }

    public function test_the_school_admin_is_created_once_the_code_is_confirmed(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)->post(route('superadmin.school-admins.store'), $this->schoolAdminPayload());

        $this->actingAs($admin)
            ->post(route('superadmin.school-admins.otp.verify'), ['code' => self::GOOD_CODE])
            ->assertRedirect(route('superadmin.school-admins.index'));

        $this->assertDatabaseHas('users', [
            'email' => 'albert.palao@example.com',
            'user_role' => 'school_admin',
            'school_id' => $this->school->id,
            'phone' => '09557267615',
        ]);
    }

    public function test_a_wrong_code_creates_nothing(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)->post(route('superadmin.school-admins.store'), $this->schoolAdminPayload());

        $this->actingAs($admin)
            ->post(route('superadmin.school-admins.otp.verify'), ['code' => '000000'])
            ->assertSessionHasErrors('code');

        $this->assertDatabaseMissing('users', ['email' => 'albert.palao@example.com']);
    }

    public function test_one_code_cannot_create_the_same_account_twice(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)->post(route('superadmin.school-admins.store'), $this->schoolAdminPayload());
        $this->actingAs($admin)->post(route('superadmin.school-admins.otp.verify'), ['code' => self::GOOD_CODE]);
        $this->actingAs($admin)->post(route('superadmin.school-admins.otp.verify'), ['code' => self::GOOD_CODE]);

        $this->assertSame(1, User::where('email', 'albert.palao@example.com')->count());
    }

    public function test_cancelling_discards_the_pending_account(): void
    {
        $admin = $this->superAdmin();

        $this->actingAs($admin)->post(route('superadmin.school-admins.store'), $this->schoolAdminPayload());
        $this->actingAs($admin)->post(route('superadmin.school-admins.otp.cancel'))->assertRedirect();

        $this->actingAs($admin)
            ->get(route('superadmin.school-admins.create'))
            ->assertInertia(fn ($page) => $page->where('otpPending', null)->etc());

        $this->actingAs($admin)
            ->post(route('superadmin.school-admins.otp.verify'), ['code' => self::GOOD_CODE])
            ->assertSessionHasErrors('code');

        $this->assertDatabaseMissing('users', ['email' => 'albert.palao@example.com']);
    }

    public function test_a_mobile_number_is_required_when_the_code_has_to_go_somewhere(): void
    {
        $this->actingAs($this->superAdmin())
            ->post(route('superadmin.school-admins.store'), $this->schoolAdminPayload(['phone' => '']))
            ->assertSessionHasErrors('phone');
    }

    // ------------------------------------------------------------------
    //  School admin → librarian
    // ------------------------------------------------------------------

    public function test_creating_a_librarian_waits_for_the_code_too(): void
    {
        $admin = $this->schoolAdmin();

        $this->actingAs($admin)
            ->post(route('admin.users.store'), $this->librarianPayload())
            ->assertRedirect(route('admin.users.create'));

        $this->assertDatabaseMissing('users', ['email' => 'yrica@example.com']);

        $this->actingAs($admin)
            ->post(route('admin.users.otp.verify'), ['code' => self::GOOD_CODE])
            ->assertRedirect(route('admin.users.index'));

        $this->assertDatabaseHas('users', [
            'email' => 'yrica@example.com',
            'user_role' => 'librarian',
            'school_id' => $this->school->id,
        ]);
    }

    // ------------------------------------------------------------------
    //  Manual student registration
    // ------------------------------------------------------------------

    public function test_manual_student_registration_waits_for_the_code(): void
    {
        $admin = $this->schoolAdmin();

        $this->actingAs($admin)
            ->post(route('admin.students.manual-register.store'), $this->studentPayload())
            ->assertRedirect(route('admin.students.manual-register'));

        $this->assertDatabaseMissing('users', ['email' => 'juan.montenegro@example.com']);
        $this->assertDatabaseCount('lrn_registry', 0);

        $this->actingAs($admin)
            ->post(route('admin.students.manual-register.verify'), ['code' => self::GOOD_CODE])
            ->assertRedirect(route('admin.students.index'));

        $this->assertDatabaseHas('users', [
            'email' => 'juan.montenegro@example.com',
            'user_role' => 'user',
            'school_id' => $this->school->id,
        ]);
        $this->assertDatabaseHas('lrn_registry', ['name' => 'Juan Montenegro', 'school_id' => $this->school->id]);
    }

    public function test_the_confirmed_student_keeps_the_lrn_grade_and_section_that_were_typed(): void
    {
        $admin = $this->schoolAdmin();
        Section::create(['school_id' => $this->school->id, 'grade_level' => 'Grade 7', 'name' => 'Mabini']);

        $this->actingAs($admin)->post(route('admin.students.manual-register.store'), $this->studentPayload([
            'lrn' => '123456789012',
            'grade_level' => 'Grade 7',
            'section' => 'Mabini',
        ]));

        $this->actingAs($admin)->post(route('admin.students.manual-register.verify'), ['code' => self::GOOD_CODE]);

        $this->assertDatabaseHas('users', ['lrn' => '123456789012', 'student_id' => '123456789012']);
        $this->assertDatabaseHas('lrn_registry', [
            'lrn' => '123456789012',
            'grade_level' => 'Grade 7',
            'section' => 'Mabini',
        ]);
        $this->assertSame('2005-04-12', LrnRegistry::first()->birthdate->toDateString());
    }

    public function test_with_the_confirmation_step_off_the_account_is_created_straight_away(): void
    {
        config(['services.account_otp.enabled' => false]);

        $this->actingAs($this->schoolAdmin())
            ->post(route('admin.students.manual-register.store'), $this->studentPayload())
            ->assertRedirect(route('admin.students.index'));

        $this->assertDatabaseHas('users', ['email' => 'juan.montenegro@example.com']);
    }
}
