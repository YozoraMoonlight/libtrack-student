<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Fine;
use App\Models\NotificationLog;
use App\Models\Transaction;
use App\Models\User;
use App\Services\IprogSmsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class UserFinesAndRemindersTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function student(): User
    {
        return User::factory()->create([
            'user_role' => 'user',
            'is_active' => true,
            'phone' => '09171234567',
        ]);
    }

    private function book(array $o = []): Book
    {
        return Book::create(array_merge([
            'title' => 'Some Book',
            'author' => 'Someone',
            'total_copies' => 1,
            'available_copies' => 1,
        ], $o));
    }

    private function fine(User $user, array $o = []): Fine
    {
        return Fine::create(array_merge([
            'user_id' => $user->id,
            'transaction_id' => null,
            'type' => 'lost',
            'amount' => 100,
            'paid_amount' => 0,
            'status' => 'unpaid',
        ], $o));
    }

    // -----------------------------------------------------------
    // My Fines: total unpaid calculation
    // -----------------------------------------------------------

    public function test_my_fines_total_unpaid_sums_all_unpaid_and_partial_fines(): void
    {
        $student = $this->student();

        // Two unpaid, one partial, one paid, one waived — spread across pages.
        $this->fine($student, ['amount' => 50.00, 'paid_amount' => 0, 'status' => 'unpaid']);
        $this->fine($student, ['amount' => 75.50, 'paid_amount' => 0, 'status' => 'unpaid']);
        $this->fine($student, ['amount' => 200.00, 'paid_amount' => 50.00, 'status' => 'partial']); // 150 remaining
        $this->fine($student, ['amount' => 99.99, 'paid_amount' => 99.99, 'status' => 'paid']);    // excluded
        $this->fine($student, ['amount' => 10.00, 'paid_amount' => 0, 'status' => 'waived']);      // excluded

        $response = $this->actingAs($student)->get('/my-fines');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('User/Fines/Index')
            ->where('totalUnpaid', 275.50) // 50 + 75.50 + 150
        );
    }

    public function test_my_fines_total_unpaid_is_zero_when_no_outstanding_fines(): void
    {
        $student = $this->student();

        $this->fine($student, ['amount' => 30, 'paid_amount' => 30, 'status' => 'paid']);

        $this->actingAs($student)->get('/my-fines')
            ->assertInertia(fn ($page) => $page->where('totalUnpaid', fn ($v) => (float) $v === 0.0));
    }

    public function test_my_fines_total_unpaid_does_not_include_other_users_fines(): void
    {
        $alice = $this->student();
        $bob = User::factory()->create(['user_role' => 'user', 'is_active' => true]);

        $this->fine($alice, ['amount' => 25, 'status' => 'unpaid']);
        $this->fine($bob, ['amount' => 500, 'status' => 'unpaid']);

        $this->actingAs($alice)->get('/my-fines')
            ->assertInertia(fn ($page) => $page->where('totalUnpaid', fn ($v) => (float) $v === 25.0));
    }

    public function test_my_fines_total_unpaid_aggregates_across_multiple_pages(): void
    {
        $student = $this->student();

        // 15 unpaid fines of 10 each = 150 total; paginator shows 10 per page
        for ($i = 0; $i < 15; $i++) {
            $this->fine($student, ['amount' => 10, 'status' => 'unpaid']);
        }

        $this->actingAs($student)->get('/my-fines')
            ->assertInertia(fn ($page) => $page->where('totalUnpaid', fn ($v) => (float) $v === 150.0));
    }

    // -----------------------------------------------------------
    // Due reminder command
    // -----------------------------------------------------------

    public function test_send_due_reminders_sends_sms_for_books_due_today(): void
    {
        $student = $this->student();
        $book = $this->book(['title' => 'Atomic Habits']);

        Transaction::create([
            'user_id' => $student->id,
            'book_id' => $book->id,
            'type' => 'borrow',
            'borrowed_at' => Carbon::now()->subDays(7),
            'due_date' => Carbon::now('Asia/Manila')->startOfDay()->addHours(12),
            'status' => 'active',
        ]);

        $sms = Mockery::mock(IprogSmsService::class);
        $sms->shouldReceive('sendNow')
            ->once()
            ->with('09171234567', Mockery::on(fn ($msg) => str_contains($msg, 'Atomic Habits') && str_contains($msg, 'today')))
            ->andReturn(true);
        $this->app->instance(IprogSmsService::class, $sms);

        $this->artisan('books:send-due-reminders')
            ->assertExitCode(0);

        $this->assertDatabaseHas('notifications_log', [
            'user_id' => $student->id,
            'type' => 'due_reminder',
            'channel' => 'sms',
            'title' => 'Due Reminder SMS Sent',
        ]);
    }

    public function test_send_due_reminders_skips_users_without_phone(): void
    {
        $student = User::factory()->create([
            'user_role' => 'user',
            'is_active' => true,
            'phone' => null,
        ]);
        $book = $this->book();

        Transaction::create([
            'user_id' => $student->id,
            'book_id' => $book->id,
            'type' => 'borrow',
            'borrowed_at' => Carbon::now()->subDays(7),
            'due_date' => Carbon::now('Asia/Manila')->startOfDay()->addHours(12),
            'status' => 'active',
        ]);

        $sms = Mockery::mock(IprogSmsService::class);
        $sms->shouldNotReceive('sendNow');
        $this->app->instance(IprogSmsService::class, $sms);

        $this->artisan('books:send-due-reminders')->assertExitCode(0);

        $this->assertDatabaseMissing('notifications_log', [
            'user_id' => $student->id,
            'type' => 'due_reminder',
        ]);
    }

    public function test_send_due_reminders_does_not_send_for_books_due_tomorrow_by_default(): void
    {
        $student = $this->student();
        $book = $this->book();

        Transaction::create([
            'user_id' => $student->id,
            'book_id' => $book->id,
            'type' => 'borrow',
            'borrowed_at' => Carbon::now()->subDays(7),
            'due_date' => Carbon::now('Asia/Manila')->startOfDay()->addDay()->addHours(12),
            'status' => 'active',
        ]);

        $sms = Mockery::mock(IprogSmsService::class);
        $sms->shouldNotReceive('sendNow');
        $this->app->instance(IprogSmsService::class, $sms);

        $this->artisan('books:send-due-reminders')->assertExitCode(0);
    }

    public function test_send_due_reminders_with_days_1_targets_tomorrow(): void
    {
        $student = $this->student();
        $book = $this->book(['title' => 'Merriam-Webster']);

        Transaction::create([
            'user_id' => $student->id,
            'book_id' => $book->id,
            'type' => 'borrow',
            'borrowed_at' => Carbon::now()->subDays(7),
            'due_date' => Carbon::now('Asia/Manila')->startOfDay()->addDay()->addHours(12),
            'status' => 'active',
        ]);

        $sms = Mockery::mock(IprogSmsService::class);
        $sms->shouldReceive('sendNow')
            ->once()
            ->with('09171234567', Mockery::on(fn ($msg) => str_contains($msg, 'tomorrow')))
            ->andReturn(true);
        $this->app->instance(IprogSmsService::class, $sms);

        $this->artisan('books:send-due-reminders', ['--days' => 1])
            ->assertExitCode(0);
    }

    public function test_send_due_reminders_skips_when_reminder_already_sent_today(): void
    {
        $student = $this->student();
        $book = $this->book(['title' => 'Atomic Habits']);

        $transaction = Transaction::create([
            'user_id' => $student->id,
            'book_id' => $book->id,
            'type' => 'borrow',
            'borrowed_at' => Carbon::now()->subDays(7),
            'due_date' => Carbon::now('Asia/Manila')->startOfDay()->addHours(12),
            'status' => 'active',
        ]);

        NotificationLog::create([
            'user_id' => $student->id,
            'type' => 'due_reminder',
            'title' => 'Due Reminder SMS Sent',
            'message' => "[tx-{$transaction->id}] Hi x, LIBTRACK reminder: please return 'Atomic Habits' today",
            'channel' => 'sms',
            'sent_at' => Carbon::now(),
        ]);

        $sms = Mockery::mock(IprogSmsService::class);
        $sms->shouldNotReceive('sendNow');
        $this->app->instance(IprogSmsService::class, $sms);

        $this->artisan('books:send-due-reminders')->assertExitCode(0);
    }

    public function test_send_due_reminders_dry_run_does_not_call_sms(): void
    {
        $student = $this->student();
        $book = $this->book();

        Transaction::create([
            'user_id' => $student->id,
            'book_id' => $book->id,
            'type' => 'borrow',
            'borrowed_at' => Carbon::now()->subDays(7),
            'due_date' => Carbon::now('Asia/Manila')->startOfDay()->addHours(12),
            'status' => 'active',
        ]);

        $sms = Mockery::mock(IprogSmsService::class);
        $sms->shouldNotReceive('sendNow');
        $this->app->instance(IprogSmsService::class, $sms);

        $this->artisan('books:send-due-reminders', ['--dry-run' => true])->assertExitCode(0);

        $this->assertDatabaseMissing('notifications_log', [
            'user_id' => $student->id,
            'type' => 'due_reminder',
        ]);
    }

    public function test_send_due_reminders_logs_failure_when_sms_fails(): void
    {
        $student = $this->student();
        $book = $this->book();

        Transaction::create([
            'user_id' => $student->id,
            'book_id' => $book->id,
            'type' => 'borrow',
            'borrowed_at' => Carbon::now()->subDays(7),
            'due_date' => Carbon::now('Asia/Manila')->startOfDay()->addHours(12),
            'status' => 'active',
        ]);

        $sms = Mockery::mock(IprogSmsService::class);
        $sms->shouldReceive('sendNow')->once()->andReturn(false);
        $this->app->instance(IprogSmsService::class, $sms);

        $this->artisan('books:send-due-reminders')->assertExitCode(0);

        $this->assertDatabaseHas('notifications_log', [
            'user_id' => $student->id,
            'title' => 'Due Reminder SMS Failed',
        ]);
    }
}
