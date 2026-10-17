<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\BookCopy;
use App\Models\Category;
use App\Models\School;
use App\Models\Transaction;
use App\Models\User;
use App\Services\CirculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Regression cover for the reported bug:
 *
 *   Student 1 borrows English Book copy 1, Student 2 borrows copy 2. Because
 *   both copies carried the SAME title-level QR code, Student 1 could hand back
 *   copy 2 and have it accepted against their own loan.
 *
 * Every copy now has its own QR, and returnBook() refuses a scanned copy that
 * isn't the one the loan was issued on.
 */
class BookCopyCirculationTest extends TestCase
{
    use RefreshDatabase;

    protected School $school;

    protected function setUp(): void
    {
        parent::setUp();
        $this->school = School::create(['code' => 'CPY', 'name' => 'Copy Test High', 'is_active' => true]);
    }

    private function student(string $email): User
    {
        return User::create([
            'name' => 'Student ' . $email,
            'email' => $email,
            'password' => Hash::make('Password123!'),
            'user_role' => 'user',
            'school_id' => $this->school->id,
            'is_active' => true,
        ]);
    }

    private function book(int $copies = 2, string $title = 'English 7'): Book
    {
        return Book::create([
            'title' => $title,
            'author' => 'DepEd',
            'category_id' => Category::create(['name' => 'English ' . uniqid()])->id,
            'school_id' => $this->school->id,
            'total_copies' => $copies,
            'available_copies' => $copies,
            'status' => 'available',
        ]);
    }

    private function circulation(): CirculationService
    {
        return app(CirculationService::class);
    }

    public function test_each_physical_copy_gets_its_own_qr_code(): void
    {
        $book = $this->book(3);

        $codes = $book->copies()->pluck('qr_code');

        $this->assertCount(3, $codes);
        $this->assertCount(3, $codes->unique(), 'Copies of the same title must not share a QR code.');
        $this->assertNotContains(null, $codes->all());
    }

    public function test_copies_of_different_titles_never_collide(): void
    {
        $this->book(2, 'English 7');
        $this->book(2, 'Science 7');

        $all = BookCopy::pluck('qr_code');

        $this->assertSame($all->count(), $all->unique()->count());
    }

    public function test_borrowing_takes_a_specific_copy_off_the_shelf(): void
    {
        $book = $this->book(2);
        $student = $this->student('s1@test.io');
        $copy = $book->copies()->orderBy('copy_number')->first();

        $tx = $this->circulation()->borrowBook($student->id, $book->id, null, null, null, $copy->id);

        $this->assertSame($copy->id, $tx->book_copy_id);
        $this->assertSame('borrowed', $copy->fresh()->status);
        $this->assertSame(1, $book->fresh()->available_copies);
        $this->assertSame('available', $book->fresh()->status, 'One copy is still on the shelf.');
    }

    public function test_a_copy_already_on_loan_cannot_be_borrowed_again(): void
    {
        $book = $this->book(2);
        $copy = $book->copies()->orderBy('copy_number')->first();

        $this->circulation()->borrowBook($this->student('a@test.io')->id, $book->id, null, null, null, $copy->id);

        $this->expectExceptionMessageMatches('/not on the shelf/');
        $this->circulation()->borrowBook($this->student('b@test.io')->id, $book->id, null, null, null, $copy->id);
    }

    /** THE REPORTED BUG. */
    public function test_returning_another_students_copy_is_rejected(): void
    {
        $book = $this->book(2);
        $copy1 = $book->copies()->where('copy_number', 1)->first();
        $copy2 = $book->copies()->where('copy_number', 2)->first();

        $student1 = $this->student('one@test.io');
        $student2 = $this->student('two@test.io');

        $loan1 = $this->circulation()->borrowBook($student1->id, $book->id, null, null, null, $copy1->id);
        $loan2 = $this->circulation()->borrowBook($student2->id, $book->id, null, null, null, $copy2->id);

        $this->assertNotSame($copy1->qr_code, $copy2->qr_code);

        // Student 1 tries to close their own loan by handing over copy 2.
        try {
            $this->circulation()->returnBook($loan1->id, null, "LIBTRACK:COPY:{$copy2->qr_code}");
            $this->fail('Returning a different copy against this loan should have been rejected.');
        } catch (\Exception $e) {
            $this->assertStringContainsString('Wrong copy', $e->getMessage());
        }

        // Nothing moved: both loans are still open and both copies still out.
        $this->assertSame('active', $loan1->fresh()->status);
        $this->assertSame('active', $loan2->fresh()->status);
        $this->assertSame('borrowed', $copy1->fresh()->status);
        $this->assertSame('borrowed', $copy2->fresh()->status);
        $this->assertSame(0, $book->fresh()->available_copies);
    }

    public function test_returning_the_correct_copy_succeeds(): void
    {
        $book = $this->book(2);
        $copy1 = $book->copies()->where('copy_number', 1)->first();
        $student = $this->student('right@test.io');

        $loan = $this->circulation()->borrowBook($student->id, $book->id, null, null, null, $copy1->id);
        $this->circulation()->returnBook($loan->id, null, "LIBTRACK:COPY:{$copy1->qr_code}");

        $this->assertSame('returned', $loan->fresh()->status);
        $this->assertSame('available', $copy1->fresh()->status);
        $this->assertSame(2, $book->fresh()->available_copies);
    }

    public function test_legacy_title_level_qr_resolves_to_a_single_copy_only(): void
    {
        $book = $this->book(2);
        $copy1 = $book->copies()->where('copy_number', 1)->first();
        $copy2 = $book->copies()->where('copy_number', 2)->first();

        // Simulate a label printed before per-copy codes: the backfill gives
        // copy #1 the title's code.
        $copy1->update(['qr_code' => $book->qr_code]);

        $resolved = $this->circulation()->resolveCopyByQr("LIBTRACK:BOOK:{$book->qr_code}");

        $this->assertNotNull($resolved);
        $this->assertSame($copy1->id, $resolved->id);
        $this->assertNotSame($copy2->id, $resolved->id);
    }

    /**
     * Reported: returning with the book's QR said "No active loan found". The
     * QR shown on the book page / student Browse Books is the TITLE label, and
     * a book created after per-copy codes has no copy carrying that code.
     */
    public function test_title_qr_returns_a_loan_on_a_book_created_after_per_copy_codes(): void
    {
        $book = $this->book(2);
        $copy2 = $book->copies()->where('copy_number', 2)->first();
        $student = $this->student('title@test.io');

        $this->assertFalse(
            $book->copies()->where('qr_code', $book->qr_code)->exists(),
            'Precondition: a new book has no copy carrying the title code.'
        );

        $loan = $this->circulation()->borrowBook($student->id, $book->id, null, null, null, $copy2->id);
        $this->circulation()->returnBook($loan->id, null, "LIBTRACK:BOOK:{$book->qr_code}");

        $loan->refresh();
        $this->assertSame('returned', $loan->status);
        $this->assertStringContainsString('title QR', (string) $loan->notes);
        $this->assertStringContainsString($copy2->accession_number, (string) $loan->notes);
        $this->assertSame('available', $copy2->fresh()->status);
        $this->assertSame(2, $book->fresh()->available_copies);
    }

    public function test_title_qr_of_a_different_book_is_rejected_on_return(): void
    {
        $english = $this->book(1, 'English 7');
        $science = $this->book(1, 'Science 7');
        $loan = $this->circulation()->borrowBook($this->student('wrongtitle@test.io')->id, $english->id);

        try {
            $this->circulation()->returnBook($loan->id, null, "LIBTRACK:BOOK:{$science->qr_code}");
            $this->fail('A title label for another book must not close this loan.');
        } catch (\Exception $e) {
            $this->assertStringContainsString('Wrong book', $e->getMessage());
        }

        $this->assertSame('active', $loan->fresh()->status);
    }

    public function test_librarian_can_return_through_the_desk_with_a_title_qr(): void
    {
        $book = $this->book(1);
        $librarian = User::create([
            'name' => 'Desk Librarian',
            'email' => 'desk@test.io',
            'password' => Hash::make('Password123!'),
            'user_role' => 'librarian',
            'school_id' => $this->school->id,
            'is_active' => true,
        ]);
        $loan = $this->circulation()->borrowBook($this->student('desk-student@test.io')->id, $book->id);

        $this->actingAs($librarian)
            ->post(route('admin.circulation.process-return'), [
                'transaction_id' => $loan->id,
                'scanned_copy_qr' => "LIBTRACK:BOOK:{$book->qr_code}",
            ])
            ->assertSessionHas('success');

        $this->assertSame('returned', $loan->fresh()->status);
    }

    /** Reported: the desk lost its "scan the student's QR" step on return. */
    public function test_a_student_qr_that_is_not_the_borrowers_is_refused_on_return(): void
    {
        $book = $this->book(1);
        $borrower = $this->student('borrower@test.io');
        $classmate = $this->student('classmate@test.io');
        $copy = $book->copies()->first();
        $loan = $this->circulation()->borrowBook($borrower->id, $book->id, null, null, null, $copy->id);

        try {
            $this->circulation()->returnBook($loan->id, null, "LIBTRACK:COPY:{$copy->qr_code}", false, "LIBTRACK:USER:{$classmate->qr_code}");
            $this->fail("A classmate's student QR must not close this loan.");
        } catch (\Exception $e) {
            $this->assertStringContainsString('Wrong student', $e->getMessage());
            $this->assertStringNotContainsString($classmate->name, $e->getMessage());
        }

        $this->assertSame('active', $loan->fresh()->status);
        $this->assertSame('borrowed', $copy->fresh()->status);
    }

    public function test_the_borrowers_student_qr_is_accepted_and_recorded(): void
    {
        $book = $this->book(2);
        $student = $this->student('verified@test.io');
        $copy = $book->copies()->first();

        $scanned = $this->circulation()->borrowBook($student->id, $book->id, null, null, null, $copy->id);
        $this->circulation()->returnBook($scanned->id, null, "LIBTRACK:COPY:{$copy->qr_code}", false, "LIBTRACK:USER:{$student->qr_code}");
        $this->assertSame('returned', $scanned->fresh()->status);
        $this->assertStringContainsString("student QR verified", (string) $scanned->fresh()->notes);

        // Student scanned but the label was unreadable: still an override, and
        // the note says which part WAS verified.
        $override = $this->circulation()->borrowBook($student->id, $book->id, null, null, null, $copy->id);
        $this->circulation()->returnBook($override->id, null, null, true, "LIBTRACK:USER:{$student->qr_code}");
        $notes = (string) $override->fresh()->notes;
        $this->assertStringContainsString('without QR verification', $notes);
        $this->assertStringContainsString("borrower's student QR verified", $notes);
    }

    public function test_the_return_desk_refuses_a_mismatched_student_qr_over_http(): void
    {
        $book = $this->book(1);
        $librarian = User::create([
            'name' => 'Desk Librarian',
            'email' => 'desk2@test.io',
            'password' => Hash::make('Password123!'),
            'user_role' => 'librarian',
            'school_id' => $this->school->id,
            'is_active' => true,
        ]);
        $borrower = $this->student('http-borrower@test.io');
        $classmate = $this->student('http-classmate@test.io');
        $loan = $this->circulation()->borrowBook($borrower->id, $book->id);

        // The desk needs each borrower's QR to match a scan to their loans.
        $this->actingAs($librarian)
            ->get(route('librarian.circulation.return'))
            ->assertInertia(fn ($page) => $page->where('transactions.0.user.qr_code', $borrower->qr_code));

        $this->actingAs($librarian)
            ->post(route('admin.circulation.process-return'), [
                'transaction_id' => $loan->id,
                'override_scan' => true,
                'scanned_user_qr' => "LIBTRACK:USER:{$classmate->qr_code}",
            ])
            ->assertSessionHas('error');
        $this->assertSame('active', $loan->fresh()->status);

        $this->actingAs($librarian)
            ->post(route('admin.circulation.process-return'), [
                'transaction_id' => $loan->id,
                'override_scan' => true,
                'scanned_user_qr' => "LIBTRACK:USER:{$borrower->qr_code}",
            ])
            ->assertSessionHas('success');
        $this->assertSame('returned', $loan->fresh()->status);
    }

    public function test_scanning_an_unknown_code_on_return_is_rejected(): void
    {
        $book = $this->book(1);
        $student = $this->student('unknown@test.io');
        $loan = $this->circulation()->borrowBook($student->id, $book->id);

        $this->expectExceptionMessageMatches('/does not match any book copy/');
        $this->circulation()->returnBook($loan->id, null, 'LIBTRACK:COPY:not-a-real-uuid');
    }

    public function test_borrow_without_a_copy_id_auto_assigns_the_lowest_free_copy(): void
    {
        $book = $this->book(2);
        $student = $this->student('auto@test.io');

        $tx = $this->circulation()->borrowBook($student->id, $book->id);

        $this->assertSame(1, $tx->bookCopy->copy_number);
    }

    public function test_borrowing_when_every_copy_is_out_is_refused(): void
    {
        $book = $this->book(1);
        $this->circulation()->borrowBook($this->student('x@test.io')->id, $book->id);

        $this->expectExceptionMessageMatches('/No copies available/');
        $this->circulation()->borrowBook($this->student('y@test.io')->id, $book->id);
    }

    public function test_a_copy_from_another_title_is_refused_at_borrow(): void
    {
        $english = $this->book(1, 'English 7');
        $science = $this->book(1, 'Science 7');
        $student = $this->student('mix@test.io');

        $this->expectExceptionMessageMatches('/does not belong to the selected book/');
        $this->circulation()->borrowBook(
            $student->id,
            $english->id,
            null,
            null,
            null,
            $science->copies()->first()->id
        );
    }

    public function test_returning_a_loan_recorded_before_per_copy_tracking_still_works(): void
    {
        $book = $this->book(2);
        $student = $this->student('legacy@test.io');

        // A loan written straight to the table with no copy attached.
        $book->forceFill(['available_copies' => 1])->save();
        $loan = Transaction::create([
            'user_id' => $student->id,
            'book_id' => $book->id,
            'type' => 'borrow',
            'borrowed_at' => now()->subDays(2),
            'due_date' => now()->addDays(5),
            'status' => 'active',
        ]);

        $returned = $this->circulation()->returnBook($loan->id);

        $this->assertSame('returned', $returned->status);
    }

    public function test_a_scan_cannot_close_a_legacy_loan_that_has_no_copy(): void
    {
        $book = $this->book(2);
        $student = $this->student('legacy2@test.io');
        $loan = Transaction::create([
            'user_id' => $student->id,
            'book_id' => $book->id,
            'type' => 'borrow',
            'borrowed_at' => now()->subDays(2),
            'due_date' => now()->addDays(5),
            'status' => 'active',
        ]);

        $this->expectExceptionMessageMatches('/predates per-copy tracking/');
        $this->circulation()->returnBook($loan->id, null, "LIBTRACK:COPY:{$book->copies()->first()->qr_code}");
    }
}
