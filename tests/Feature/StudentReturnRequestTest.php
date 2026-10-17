<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Category;
use App\Models\School;
use App\Models\Transaction;
use App\Models\User;
use App\Services\CirculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Reported: the student page had no way to return a book, and no QR option.
 *
 * A student now ASKS to return — from the list or by scanning the book's QR —
 * and the loan closes only when a librarian receives the book. A request must
 * never close the loan or put the copy back on the shelf by itself.
 */
class StudentReturnRequestTest extends TestCase
{
    use RefreshDatabase;

    protected School $school;

    protected function setUp(): void
    {
        parent::setUp();
        $this->school = School::create(['code' => 'RET', 'name' => 'Return High', 'is_active' => true]);
    }

    private function user(string $email, string $role = 'user'): User
    {
        return User::create([
            'name' => ucfirst(strtok($email, '@')),
            'email' => $email,
            'password' => Hash::make('Password123!'),
            'user_role' => $role,
            'school_id' => $this->school->id,
            'is_active' => true,
        ]);
    }

    private function book(int $copies = 2, string $title = 'Basic Java'): Book
    {
        return Book::create([
            'title' => $title,
            'author' => 'DepEd',
            'category_id' => Category::create(['name' => 'Cat ' . uniqid()])->id,
            'school_id' => $this->school->id,
            'total_copies' => $copies,
            'available_copies' => $copies,
            'status' => 'available',
        ]);
    }

    private function borrow(User $student, Book $book, int $copyNumber = 1): Transaction
    {
        $copy = $book->copies()->where('copy_number', $copyNumber)->first();

        return app(CirculationService::class)->borrowBook($student->id, $book->id, null, null, null, $copy->id);
    }

    public function test_my_borrowings_lists_every_open_loan_for_the_return_section(): void
    {
        $student = $this->user('sofia@test.io');
        $open = $this->borrow($student, $this->book(1, 'Basic Java'));
        $closed = $this->borrow($student, $this->book(1, 'Old Book'));
        app(CirculationService::class)->returnBook($closed->id, null, null, true);

        $this->actingAs($student)
            ->get(route('user.borrowings.index'))
            ->assertInertia(fn ($page) => $page
                ->component('User/Borrowings/Index')
                ->has('activeLoans', 1)
                ->where('activeLoans.0.id', $open->id)
                ->where('activeLoans.0.book_title', 'Basic Java')
                ->where('activeLoans.0.accession_number', $open->bookCopy->accession_number)
                ->where('activeLoans.0.return_requested_at', null)
                // The copy's QR is what the desk verifies against; students don't get it.
                ->missing('activeLoans.0.qr_code'));
    }

    public function test_a_student_can_request_a_return_from_the_list_without_closing_the_loan(): void
    {
        $student = $this->user('list@test.io');
        $loan = $this->borrow($student, $this->book());

        $this->actingAs($student)
            ->post(route('user.borrowings.return-request'), ['transaction_id' => $loan->id])
            ->assertSessionHas('success');

        $loan->refresh();
        $this->assertNotNull($loan->return_requested_at);
        $this->assertSame('manual', $loan->return_request_method);
        $this->assertSame('active', $loan->status, 'Only the librarian closes the loan.');
        $this->assertNull($loan->returned_at);
        $this->assertSame('borrowed', $loan->bookCopy->fresh()->status);
    }

    public function test_a_student_can_request_a_return_by_scanning_the_copy_label(): void
    {
        $student = $this->user('copyscan@test.io');
        $loan = $this->borrow($student, $this->book());

        $this->actingAs($student)
            ->post(route('user.borrowings.return-request'), ['scanned_qr' => "LIBTRACK:COPY:{$loan->bookCopy->qr_code}"])
            ->assertSessionHas('success');

        $this->assertSame('qr', $loan->fresh()->return_request_method);
        $this->assertSame('active', $loan->fresh()->status);
    }

    public function test_a_student_can_request_a_return_by_scanning_the_title_label(): void
    {
        $student = $this->user('titlescan@test.io');
        $book = $this->book();
        $loan = $this->borrow($student, $book, 2);

        $this->actingAs($student)
            ->post(route('user.borrowings.return-request'), ['scanned_qr' => "LIBTRACK:BOOK:{$book->qr_code}"])
            ->assertSessionHas('success');

        $this->assertNotNull($loan->fresh()->return_requested_at);
    }

    public function test_scanning_a_classmates_copy_is_refused_and_touches_neither_loan(): void
    {
        $book = $this->book();
        $me = $this->user('me@test.io');
        $classmate = $this->user('classmate@test.io');
        $mine = $this->borrow($me, $book, 1);
        $theirs = $this->borrow($classmate, $book, 2);

        $this->actingAs($me)
            ->post(route('user.borrowings.return-request'), ['scanned_qr' => "LIBTRACK:COPY:{$theirs->bookCopy->qr_code}"])
            ->assertSessionHas('error', fn ($msg) => str_contains($msg, $mine->bookCopy->accession_number));

        $this->assertNull($mine->fresh()->return_requested_at);
        $this->assertNull($theirs->fresh()->return_requested_at);
    }

    public function test_scanning_a_book_the_student_does_not_have_is_refused(): void
    {
        $student = $this->user('nobook@test.io');
        $this->borrow($student, $this->book(1, 'Basic Java'));
        $other = $this->book(1, 'Science 7');

        $this->actingAs($student)
            ->post(route('user.borrowings.return-request'), ['scanned_qr' => "LIBTRACK:BOOK:{$other->qr_code}"])
            ->assertSessionHas('error', fn ($msg) => str_contains($msg, 'not one of your borrowed books'));

        $this->actingAs($student)
            ->post(route('user.borrowings.return-request'), ['scanned_qr' => 'hello'])
            ->assertSessionHas('error', fn ($msg) => str_contains($msg, 'not a LIBTRACK book label'));
    }

    public function test_a_student_cannot_request_a_return_on_someone_elses_loan(): void
    {
        $owner = $this->user('owner@test.io');
        $intruder = $this->user('intruder@test.io');
        $loan = $this->borrow($owner, $this->book());

        $this->actingAs($intruder)
            ->post(route('user.borrowings.return-request'), ['transaction_id' => $loan->id])
            ->assertSessionHas('error');
        $this->assertNull($loan->fresh()->return_requested_at);

        $this->actingAs($owner)->post(route('user.borrowings.return-request'), ['transaction_id' => $loan->id]);
        $this->actingAs($intruder)
            ->delete(route('user.borrowings.return-request.cancel', $loan->id))
            ->assertNotFound();
        $this->assertNotNull($loan->fresh()->return_requested_at);
    }

    public function test_a_request_needs_a_book_and_cannot_be_made_twice(): void
    {
        $student = $this->user('twice@test.io');
        $loan = $this->borrow($student, $this->book());

        $this->actingAs($student)
            ->post(route('user.borrowings.return-request'), [])
            ->assertSessionHas('error');

        $this->actingAs($student)->post(route('user.borrowings.return-request'), ['transaction_id' => $loan->id]);
        $first = $loan->fresh()->return_requested_at;

        $this->actingAs($student)
            ->post(route('user.borrowings.return-request'), ['transaction_id' => $loan->id])
            ->assertSessionHas('error', fn ($msg) => str_contains($msg, 'already asked'));
        $this->assertEquals($first, $loan->fresh()->return_requested_at);
    }

    public function test_a_student_can_cancel_their_request(): void
    {
        $student = $this->user('cancel@test.io');
        $loan = $this->borrow($student, $this->book());
        $this->actingAs($student)->post(route('user.borrowings.return-request'), ['transaction_id' => $loan->id]);

        $this->actingAs($student)
            ->delete(route('user.borrowings.return-request.cancel', $loan->id))
            ->assertSessionHas('success');

        $this->assertNull($loan->fresh()->return_requested_at);
        $this->assertNull($loan->fresh()->return_request_method);
    }

    public function test_the_librarian_sees_the_request_and_confirming_it_closes_the_loan(): void
    {
        $student = $this->user('confirm@test.io');
        $librarian = $this->user('desk@test.io', 'librarian');
        $loan = $this->borrow($student, $this->book());

        $this->actingAs($student)->post(route('user.borrowings.return-request'), [
            'scanned_qr' => "LIBTRACK:COPY:{$loan->bookCopy->qr_code}",
        ]);

        $this->actingAs($librarian)
            ->get(route('librarian.circulation.index'))
            ->assertInertia(fn ($page) => $page->where('pendingReturnRequests', 1));

        $this->actingAs($librarian)
            ->get(route('librarian.circulation.return'))
            ->assertInertia(fn ($page) => $page
                ->where('transactions.0.id', $loan->id)
                ->where('transactions.0.return_request_method', 'qr')
                ->whereNot('transactions.0.return_requested_at', null));

        // The desk still verifies the physical book when it arrives.
        $this->actingAs($librarian)
            ->post(route('admin.circulation.process-return'), [
                'transaction_id' => $loan->id,
                'scanned_copy_qr' => "LIBTRACK:COPY:{$loan->bookCopy->qr_code}",
            ])
            ->assertSessionHas('success');

        $loan->refresh();
        $this->assertSame('returned', $loan->status);
        $this->assertSame('available', $loan->bookCopy->fresh()->status);
        $this->assertNotNull($loan->return_requested_at, 'The request stays on the record.');

        $this->actingAs($librarian)
            ->get(route('librarian.circulation.index'))
            ->assertInertia(fn ($page) => $page->where('pendingReturnRequests', 0));

        // A returned loan can no longer be cancelled or re-requested.
        $this->actingAs($student)
            ->delete(route('user.borrowings.return-request.cancel', $loan->id))
            ->assertSessionHas('error');
    }

    public function test_another_schools_librarian_does_not_see_the_request(): void
    {
        $student = $this->user('scoped@test.io');
        $loan = $this->borrow($student, $this->book());
        $this->actingAs($student)->post(route('user.borrowings.return-request'), ['transaction_id' => $loan->id]);

        $otherSchool = School::create(['code' => 'OTH', 'name' => 'Other High', 'is_active' => true]);
        $outsider = User::create([
            'name' => 'Outsider',
            'email' => 'outsider@test.io',
            'password' => Hash::make('Password123!'),
            'user_role' => 'librarian',
            'school_id' => $otherSchool->id,
            'is_active' => true,
        ]);

        $this->actingAs($outsider)
            ->get(route('librarian.circulation.index'))
            ->assertInertia(fn ($page) => $page->where('pendingReturnRequests', 0));
    }
}
