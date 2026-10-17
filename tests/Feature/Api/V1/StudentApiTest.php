<?php

namespace Tests\Feature\Api\V1;

use App\Models\Book;
use App\Models\Category;
use App\Models\LrnRegistry;
use App\Models\OtpVerification;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class StudentApiTest extends TestCase
{
    use RefreshDatabase;

    protected School $school;

    protected function setUp(): void
    {
        parent::setUp();
        $this->school = School::create(['code' => 'API', 'name' => 'Api High', 'is_active' => true]);
    }

    private function student(array $overrides = []): User
    {
        return User::factory()->create(array_merge([
            'user_role' => 'user',
            'is_active' => true,
            'school_id' => $this->school->id,
            'password' => Hash::make('Password123'),
            'lrn' => fake()->unique()->numerify('############'),
        ], $overrides));
    }

    private function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    public function test_login_with_email_returns_token(): void
    {
        $user = $this->student(['email' => 'stud@example.com']);

        $res = $this->postJson('/api/v1/auth/login', [
            'email' => 'stud@example.com',
            'password' => 'Password123',
        ]);

        $res->assertOk()->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']]);
        $this->assertSame($user->id, $res->json('user.id'));
    }

    public function test_login_with_lrn_returns_token(): void
    {
        $this->student(['email' => 'lrn-student@example.com', 'lrn' => '999888777666']);

        $res = $this->postJson('/api/v1/auth/login', [
            'email' => '999888777666',
            'password' => 'Password123',
        ]);

        $res->assertOk()->assertJsonPath('user.lrn', '999888777666');
    }

    public function test_login_rejects_wrong_password_inactive_and_staff(): void
    {
        $this->student(['email' => 'a@example.com']);

        $this->postJson('/api/v1/auth/login', ['email' => 'a@example.com', 'password' => 'nope'])
            ->assertStatus(422)->assertJsonPath('errors.auth.0', 'Invalid email/LRN or password.');

        $inactive = $this->student(['email' => 'b@example.com', 'is_active' => false]);
        $this->postJson('/api/v1/auth/login', ['email' => 'b@example.com', 'password' => 'Password123'])
            ->assertStatus(422);
        $this->assertSame(0, $inactive->tokens()->count());

        $this->student(['email' => 'lib@example.com', 'user_role' => 'librarian']);
        $this->postJson('/api/v1/auth/login', ['email' => 'lib@example.com', 'password' => 'Password123'])
            ->assertStatus(422)->assertJsonPath('errors.auth.0', 'Only student accounts can use the mobile app.');
    }

    public function test_student_gate_blocks_unauth_and_staff(): void
    {
        $this->getJson('/api/v1/dashboard')->assertUnauthorized();

        $staff = $this->student(['user_role' => 'librarian']);
        $this->getJson('/api/v1/dashboard', ['Authorization' => 'Bearer '.$this->token($staff)])
            ->assertForbidden();
    }

    public function test_dashboard_and_books_scope_to_school(): void
    {
        $user = $this->student();
        $headers = ['Authorization' => 'Bearer '.$this->token($user)];

        $this->getJson('/api/v1/dashboard', $headers)->assertOk()
            ->assertJsonStructure(['user', 'qrCode', 'stats', 'upcomingDue', 'recentActivity']);

        $cat = Category::create(['name' => 'Fiction']);
        $mine = Book::create([
            'title' => 'Mine', 'author' => 'A', 'category_id' => $cat->id,
            'school_id' => $this->school->id, 'total_copies' => 1, 'status' => 'available',
        ]);
        $other = School::create(['code' => 'OTH', 'name' => 'Other', 'is_active' => true]);
        $theirs = Book::create([
            'title' => 'Theirs', 'author' => 'B', 'category_id' => $cat->id,
            'school_id' => $other->id, 'total_copies' => 1, 'status' => 'available',
        ]);

        $list = $this->getJson('/api/v1/books', $headers)->assertOk();
        $ids = collect($list->json('books.data'))->pluck('id')->all();
        $this->assertContains($mine->id, $ids);
        $this->assertNotContains($theirs->id, $ids);

        $this->getJson("/api/v1/books/{$mine->id}", $headers)->assertOk()
            ->assertJsonPath('hasActiveBorrow', false);
        $this->getJson("/api/v1/books/{$theirs->id}", $headers)->assertNotFound();
    }

    public function test_register_round_trip_creates_student_and_token(): void
    {
        LrnRegistry::create([
            'lrn' => '555555555555', 'name' => 'Reg Student',
            'school_id' => $this->school->id, 'enrollment_status' => 'enrolled',
        ]);

        $this->postJson('/api/v1/auth/register/lookup-lrn', ['lrn' => '555555555555'])
            ->assertOk()->assertJsonPath('ok', true);

        $init = $this->postJson('/api/v1/auth/register/initiate', [
            'lrn' => '555555555555',
            'email' => 'reg@example.com',
            'phone' => '09171234567',
            'password' => 'Secret1',
            'password_confirmation' => 'Secret1',
        ])->assertOk()->assertJsonStructure(['otp_id', 'expires_at', 'phone_masked']);

        OtpVerification::where('id', $init->json('otp_id'))
            ->update(['code_hash' => Hash::make('123456')]);

        $verify = $this->postJson('/api/v1/auth/register/verify', [
            'otp_id' => $init->json('otp_id'),
            'code' => '123456',
            'lrn' => '555555555555',
            'email' => 'reg@example.com',
            'phone' => '09171234567',
            'password' => 'Secret1',
            'password_confirmation' => 'Secret1',
        ])->assertCreated()->assertJsonStructure(['token', 'user']);

        $this->assertDatabaseHas('users', ['lrn' => '555555555555', 'email' => 'reg@example.com']);

        $this->getJson('/api/v1/dashboard', ['Authorization' => 'Bearer '.$verify->json('token')])
            ->assertOk();
    }

    public function test_borrowings_fines_and_settings(): void
    {
        $user = $this->student();
        $headers = ['Authorization' => 'Bearer '.$this->token($user)];

        $this->getJson('/api/v1/borrowings', $headers)->assertOk()
            ->assertJsonStructure(['borrowings', 'activeLoans']);
        $this->getJson('/api/v1/fines', $headers)->assertOk()
            ->assertJsonStructure(['fines', 'totalUnpaid']);
        $this->getJson('/api/v1/qr-card', $headers)->assertOk()
            ->assertJsonStructure(['mime', 'base64']);

        $this->postJson('/api/v1/borrowings/return-request', [], $headers)
            ->assertStatus(422);

        $this->putJson('/api/v1/settings/profile', ['name' => 'New Name'], $headers)
            ->assertOk()->assertJsonPath('name', 'New Name');
    }
}
