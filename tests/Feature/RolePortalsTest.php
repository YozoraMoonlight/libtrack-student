<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\CredentialHold;
use App\Models\LrnRegistry;
use App\Models\School;
use App\Models\User;
use App\Services\CirculationService;
use App\Services\OtpService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Mockery;
use Tests\TestCase;

/**
 * QA coverage for the per-role login portals, dashboards, and gates.
 */
class RolePortalsTest extends TestCase
{
    use RefreshDatabase;

    protected School $school;

    protected function setUp(): void
    {
        parent::setUp();
        $this->school = School::create([
            'code' => 'TEST',
            'name' => 'Test School',
            'is_active' => true,
        ]);
    }

    protected function tearDown(): void
    {
        // Mockery::close() throws when an expectation went unmet. Letting that
        // escape skipped parent::tearDown(), so RefreshDatabase never rolled
        // back its transaction and EVERY later test in the run died with
        // "There is already an active transaction". The finally keeps the
        // rollback guaranteed, so an unmet expectation fails only its own test.
        try {
            Mockery::close();
        } finally {
            parent::tearDown();
        }
    }

    private function user(string $role, array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'user_role' => $role,
            'is_active' => true,
            'school_id' => $this->school->id,
            'password' => Hash::make('Password123'),
            'phone' => '09171234500',
        ], $overrides));
    }

    // ------------------------------------------------------------------
    //  Login pages render
    // ------------------------------------------------------------------

    public function test_student_login_page_renders(): void
    {
        $this->get('/student/login')->assertOk();
    }

    public function test_admin_login_page_renders(): void
    {
        $this->get('/admin/login')->assertOk();
    }

    public function test_librarian_login_page_renders(): void
    {
        $this->get('/librarian/login')->assertOk();
    }

    public function test_superadmin_login_page_renders(): void
    {
        $this->get('/superadmin/login')->assertOk();
    }

    public function test_legacy_login_redirects_to_student_login(): void
    {
        $this->get('/login')->assertRedirect('/student/login');
    }

    public function test_legacy_dashboard_redirects_to_student_dashboard(): void
    {
        $student = $this->user('user');
        $this->actingAs($student)->get('/dashboard')->assertRedirect('/student/dashboard');
    }

    // ------------------------------------------------------------------
    //  Correct-portal auth lands on correct dashboard
    // ------------------------------------------------------------------

    public function test_student_login_redirects_to_student_dashboard(): void
    {
        $this->user('user', ['email' => 'stu@test.io']);

        $this->post('/student/login', ['email' => 'stu@test.io', 'password' => 'Password123'])
            ->assertRedirect(route('student.dashboard'));
    }

    public function test_admin_login_redirects_to_admin_dashboard(): void
    {
        $this->user('school_admin', ['email' => 'admin@test.io']);

        $this->post('/admin/login', ['email' => 'admin@test.io', 'password' => 'Password123'])
            ->assertRedirect(route('admin.dashboard'));
    }

    public function test_librarian_login_redirects_to_librarian_dashboard(): void
    {
        $this->user('librarian', ['email' => 'lib@test.io']);

        $this->post('/librarian/login', ['email' => 'lib@test.io', 'password' => 'Password123'])
            ->assertRedirect(route('librarian.dashboard'));
    }

    public function test_superadmin_login_redirects_to_superadmin_dashboard(): void
    {
        $this->user('super_admin', ['email' => 'sa@test.io']);

        $this->post('/superadmin/login', ['email' => 'sa@test.io', 'password' => 'Password123'])
            ->assertRedirect(route('superadmin.dashboard'));
    }

    // ------------------------------------------------------------------
    //  Wrong-portal credentials are rejected
    // ------------------------------------------------------------------

    public function test_admin_credentials_at_student_login_redirect_to_admin_portal(): void
    {
        $this->user('school_admin', ['email' => 'admin2@test.io']);

        $this->post('/student/login', ['email' => 'admin2@test.io', 'password' => 'Password123'])
            ->assertRedirect(route('admin.auth.login'));
        $this->assertGuest();
    }

    public function test_librarian_credentials_at_student_login_redirect_to_librarian_portal(): void
    {
        $this->user('librarian', ['email' => 'lib2@test.io']);

        $this->post('/student/login', ['email' => 'lib2@test.io', 'password' => 'Password123'])
            ->assertRedirect(route('librarian.auth.login'));
        $this->assertGuest();
    }

    public function test_superadmin_credentials_at_student_login_redirect_to_superadmin_portal(): void
    {
        $this->user('super_admin', ['email' => 'sa2@test.io']);

        $this->post('/student/login', ['email' => 'sa2@test.io', 'password' => 'Password123'])
            ->assertRedirect(route('superadmin.auth.login'));
        $this->assertGuest();
    }

    public function test_student_credentials_at_admin_login_are_rejected(): void
    {
        $this->user('user', ['email' => 'stu2@test.io']);

        $this->from('/admin/login')
            ->post('/admin/login', ['email' => 'stu2@test.io', 'password' => 'Password123'])
            ->assertSessionHasErrors('auth');
        $this->assertGuest();
    }

    public function test_superadmin_credentials_at_admin_login_are_rejected_with_hint(): void
    {
        $this->user('super_admin', ['email' => 'sa3@test.io']);

        $resp = $this->from('/admin/login')
            ->post('/admin/login', ['email' => 'sa3@test.io', 'password' => 'Password123']);

        $resp->assertSessionHasErrors('auth');
        $this->assertGuest();
        $this->assertStringContainsString('Super Admin Portal', session('errors')->first('auth'));
    }

    public function test_student_credentials_at_librarian_login_are_rejected(): void
    {
        $this->user('user', ['email' => 'stu3@test.io']);

        $this->from('/librarian/login')
            ->post('/librarian/login', ['email' => 'stu3@test.io', 'password' => 'Password123'])
            ->assertSessionHasErrors('auth');
        $this->assertGuest();
    }

    public function test_admin_credentials_at_superadmin_login_are_rejected(): void
    {
        $this->user('school_admin', ['email' => 'admin3@test.io']);

        $this->from('/superadmin/login')
            ->post('/superadmin/login', ['email' => 'admin3@test.io', 'password' => 'Password123'])
            ->assertSessionHasErrors('auth');
        $this->assertGuest();
    }

    // ------------------------------------------------------------------
    //  Disabled-account guards
    // ------------------------------------------------------------------

    public function test_disabled_student_blocked_at_student_login(): void
    {
        $this->user('user', ['email' => 'off@test.io', 'is_active' => false]);

        $this->from('/student/login')
            ->post('/student/login', ['email' => 'off@test.io', 'password' => 'Password123'])
            ->assertSessionHasErrors('auth');
        $this->assertGuest();
    }

    public function test_disabled_librarian_blocked_at_librarian_login(): void
    {
        $this->user('librarian', ['email' => 'libdis@test.io', 'is_active' => false]);

        $this->from('/librarian/login')
            ->post('/librarian/login', ['email' => 'libdis@test.io', 'password' => 'Password123'])
            ->assertSessionHasErrors('auth');
        $this->assertGuest();
    }

    // ------------------------------------------------------------------
    //  Credential-hold gates
    // ------------------------------------------------------------------

    public function test_student_with_active_hold_is_blocked_at_student_login(): void
    {
        $student = $this->user('user', ['email' => 'held@test.io']);
        CredentialHold::create([
            'user_id' => $student->id,
            'reason' => 'Unpaid fines (₱100.00)',
            'amount' => 100,
            'status' => 'active',
        ]);

        $resp = $this->from('/student/login')
            ->post('/student/login', ['email' => 'held@test.io', 'password' => 'Password123']);

        $resp->assertSessionHasErrors('auth');
        $this->assertGuest();
        $this->assertStringContainsString('on hold', session('errors')->first('auth'));
    }

    public function test_student_with_active_hold_cannot_borrow(): void
    {
        $student = $this->user('user');
        CredentialHold::create([
            'user_id' => $student->id,
            'reason' => 'Overdue books beyond 14 days',
            'amount' => 0,
            'status' => 'active',
        ]);

        $book = Book::create([
            'title' => 'Sample',
            'author' => 'Author',
            'school_id' => $this->school->id,
            'total_copies' => 2,
            'available_copies' => 2,
            'status' => 'available',
        ]);

        /** @var CirculationService $svc */
        $svc = app(CirculationService::class);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessageMatches('/account on hold/i');

        $svc->borrowBook($student->id, $book->id);
    }

    public function test_student_without_hold_can_borrow(): void
    {
        $student = $this->user('user');
        $book = Book::create([
            'title' => 'Free To Borrow',
            'author' => 'A',
            'school_id' => $this->school->id,
            'total_copies' => 2,
            'available_copies' => 2,
            'status' => 'available',
        ]);

        /** @var CirculationService $svc */
        $svc = app(CirculationService::class);
        $tx = $svc->borrowBook($student->id, $book->id);

        $this->assertNotNull($tx->id);
        $this->assertSame('active', $tx->status);
    }

    // ------------------------------------------------------------------
    //  Dashboard access control
    // ------------------------------------------------------------------

    public function test_student_dashboard_requires_auth(): void
    {
        $this->get('/student/dashboard')->assertRedirect(route('auth.login'));
    }

    public function test_admin_dashboard_requires_auth(): void
    {
        $this->get('/admin/dashboard')->assertRedirect();
    }

    public function test_librarian_dashboard_requires_auth(): void
    {
        $this->get('/librarian/dashboard')->assertRedirect();
    }

    public function test_superadmin_dashboard_requires_auth(): void
    {
        $this->get('/superadmin/dashboard')->assertRedirect();
    }

    public function test_student_can_load_student_dashboard(): void
    {
        $student = $this->user('user', ['student_id' => 'STU001', 'qr_code' => 'qr-xyz']);
        $this->actingAs($student)->get('/student/dashboard')->assertOk();
    }

    public function test_school_admin_can_load_admin_dashboard(): void
    {
        $admin = $this->user('school_admin');
        $this->actingAs($admin)->get('/admin/dashboard')->assertOk();
    }

    public function test_librarian_can_load_librarian_dashboard(): void
    {
        $lib = $this->user('librarian');
        $this->actingAs($lib)->get('/librarian/dashboard')->assertOk();
    }

    public function test_superadmin_can_load_superadmin_dashboard(): void
    {
        $sa = $this->user('super_admin');
        $this->actingAs($sa)->get('/superadmin/dashboard')->assertOk();
    }

    public function test_librarian_visiting_admin_dashboard_is_redirected_to_librarian_dashboard(): void
    {
        $lib = $this->user('librarian');
        $this->actingAs($lib)->get('/admin/dashboard')->assertRedirect('/librarian/dashboard');
    }

    public function test_student_blocked_from_admin_dashboard(): void
    {
        $student = $this->user('user');
        $this->actingAs($student)->get('/admin/dashboard')->assertRedirect();
    }

    public function test_admin_blocked_from_student_dashboard(): void
    {
        $admin = $this->user('school_admin');
        $this->actingAs($admin)->get('/student/dashboard')->assertRedirect();
    }

    // ------------------------------------------------------------------
    //  GuestMiddleware: authenticated → role dashboard
    // ------------------------------------------------------------------

    public function test_authenticated_student_visiting_login_is_redirected_to_dashboard(): void
    {
        $student = $this->user('user');
        $this->actingAs($student)->get('/student/login')->assertRedirect(route('student.dashboard'));
    }

    public function test_authenticated_librarian_visiting_admin_login_is_redirected_to_librarian_dashboard(): void
    {
        $lib = $this->user('librarian');
        $this->actingAs($lib)->get('/admin/login')->assertRedirect(route('librarian.dashboard'));
    }

    public function test_authenticated_superadmin_visiting_admin_login_is_redirected_to_superadmin_dashboard(): void
    {
        $sa = $this->user('super_admin');
        $this->actingAs($sa)->get('/admin/login')->assertRedirect(route('superadmin.dashboard'));
    }

    // ------------------------------------------------------------------
    //  Librarian OTP self-registration
    // ------------------------------------------------------------------

    public function test_librarian_register_initiate_stores_pending_session_and_issues_otp(): void
    {
        $otp = Mockery::mock(OtpService::class);
        $otp->shouldReceive('issue')
            ->once()
            ->andReturn(['id' => 1, 'sent' => true, 'debug_code' => '123456', 'expires_at' => now()->addMinutes(5)]);
        $this->app->instance(OtpService::class, $otp);

        $resp = $this->post('/register/librarian/initiate', [
            'name' => 'New Librarian',
            'email' => 'newlib@test.io',
            'phone' => '09181112233',
            'school_id' => $this->school->id,
            'password' => 'Password123',
            'password_confirmation' => 'Password123',
        ]);

        $resp->assertRedirect(route('auth.register'));
        $this->assertNotNull(session('register.pending'));
        $this->assertSame('librarian', session('register.pending.role'));
        $this->assertSame('newlib@test.io', session('register.pending.email'));
    }

    public function test_librarian_register_verify_creates_librarian_user_and_logs_in(): void
    {
        $otp = Mockery::mock(OtpService::class);
        $otp->shouldReceive('verify')
            ->once()
            ->andReturn(['ok' => true, 'error' => null]);
        $this->app->instance(OtpService::class, $otp);

        $this->withSession([
            'register.pending' => [
                'role' => 'librarian',
                'name' => 'Verified Lib',
                'email' => 'vlib@test.io',
                'phone' => '09181112244',
                'school_id' => $this->school->id,
                'password_hash' => Hash::make('Password123'),
                'otp_id' => 1,
                'otp_expires_at' => now()->addMinutes(5)->toIso8601String(),
            ],
        ])->post('/register/verify', ['code' => '123456'])
            ->assertRedirect(route('librarian.dashboard'));

        $created = User::where('email', 'vlib@test.io')->first();
        $this->assertNotNull($created);
        $this->assertSame('librarian', $created->user_role);
        $this->assertTrue((bool) $created->is_active);
    }

    public function test_student_register_verify_creates_student_user(): void
    {
        $otp = Mockery::mock(OtpService::class);
        $otp->shouldReceive('verify')
            ->once()
            ->andReturn(['ok' => true, 'error' => null]);
        $this->app->instance(OtpService::class, $otp);

        // Seed an LrnRegistry row so the pending data is consistent
        LrnRegistry::create([
            'lrn' => '123456789012',
            'name' => 'Pending Student',
            'school_id' => $this->school->id,
            'enrollment_status' => 'enrolled',
        ]);

        $this->withSession([
            'register.pending' => [
                'role' => 'student',
                'lrn' => '123456789012',
                'student_id' => '123456789012',
                'name' => 'Pending Student',
                'email' => 'pstu@test.io',
                'phone' => '09181112255',
                'school_id' => $this->school->id,
                'password_hash' => Hash::make('Password123'),
                'enrollment_status' => 'enrolled',
                'otp_id' => 2,
                'otp_expires_at' => now()->addMinutes(5)->toIso8601String(),
            ],
        ])->post('/register/verify', ['code' => '654321'])
            ->assertRedirect(route('student.dashboard'));

        $created = User::where('email', 'pstu@test.io')->first();
        $this->assertNotNull($created);
        $this->assertSame('user', $created->user_role);
        $this->assertSame('123456789012', $created->lrn);
    }
}
