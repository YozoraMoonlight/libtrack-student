<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\BookCopy;
use App\Models\Category;
use App\Models\School;
use App\Models\User;
use App\Services\CirculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Smoke + permission cover for the pages and endpoints that exist only because
 * copies do: the label sheet, the copy QR download, and the copy-aware
 * borrow/return screens. Ziggy route names are runtime-only, so these also act
 * as the check that both the admin.* and librarian.* variants really exist.
 */
class BookCopyPagesTest extends TestCase
{
    use RefreshDatabase;

    protected School $school;

    protected function setUp(): void
    {
        parent::setUp();
        $this->school = School::create(['code' => 'PGS', 'name' => 'Pages High', 'is_active' => true]);
    }

    private function staff(string $role): User
    {
        return User::factory()->create([
            'user_role' => $role,
            'is_active' => true,
            'school_id' => $this->school->id,
            'password' => Hash::make('Password1!'),
        ]);
    }

    private function book(int $copies = 3, ?int $schoolId = null): Book
    {
        return Book::create([
            'title' => 'Araling Panlipunan 7',
            'author' => 'DepEd',
            'category_id' => Category::create(['name' => 'AP ' . uniqid()])->id,
            'school_id' => $schoolId ?? $this->school->id,
            'total_copies' => $copies,
            'available_copies' => $copies,
            'status' => 'available',
        ]);
    }

    public function test_librarian_can_open_the_copy_label_sheet(): void
    {
        $book = $this->book();

        $this->actingAs($this->staff('librarian'))
            ->get("/librarian/books/{$book->id}/copies")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Books/Copies')
                ->where('book.id', $book->id)
                ->has('copies', 3)
                ->has('copies.0.qr_image')
                ->has('copies.0.accession_number')
                ->where('canManage', true)
            );
    }

    public function test_admin_can_view_but_not_manage_copies(): void
    {
        $book = $this->book();

        $this->actingAs($this->staff('school_admin'))
            ->get("/admin/books/{$book->id}/copies")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/Books/Copies')->where('canManage', false));

        $this->actingAs($this->staff('school_admin'))
            ->post("/admin/books/{$book->id}/copies")
            ->assertForbidden();
    }

    public function test_copies_of_another_school_are_blocked(): void
    {
        $other = School::create(['code' => 'OTH', 'name' => 'Other High', 'is_active' => true]);
        $book = $this->book(2, $other->id);

        $this->actingAs($this->staff('librarian'))
            ->get("/librarian/books/{$book->id}/copies")
            ->assertForbidden();
    }

    public function test_each_copy_qr_download_returns_an_image(): void
    {
        $book = $this->book(2);
        $copies = $book->copies()->orderBy('copy_number')->get();

        $bodies = [];
        foreach ($copies as $copy) {
            $resp = $this->actingAs($this->staff('librarian'))
                ->get("/librarian/books/{$book->id}/copies/{$copy->id}/qr-code");

            $resp->assertOk();
            $this->assertStringContainsString('image/', $resp->headers->get('Content-Type'));
            $bodies[] = $resp->getContent();
        }

        // Two copies must not produce byte-identical QR images.
        $this->assertNotSame($bodies[0], $bodies[1]);
    }

    public function test_a_copy_from_another_book_is_rejected_on_the_qr_route(): void
    {
        $a = $this->book(1);
        $b = $this->book(1);

        $this->actingAs($this->staff('librarian'))
            ->get("/librarian/books/{$a->id}/copies/{$b->copies()->first()->id}/qr-code")
            ->assertNotFound();
    }

    public function test_librarian_can_add_and_remove_a_copy(): void
    {
        $book = $this->book(2);
        $librarian = $this->staff('librarian');

        $this->actingAs($librarian)->post("/librarian/books/{$book->id}/copies")->assertRedirect();
        $this->assertSame(3, $book->fresh()->total_copies);
        $this->assertSame(3, $book->fresh()->available_copies);

        $newest = $book->copies()->orderByDesc('copy_number')->first();
        $this->assertSame(3, $newest->copy_number);

        $this->actingAs($librarian)
            ->delete("/librarian/books/{$book->id}/copies/{$newest->id}")
            ->assertRedirect();
        $this->assertSame(2, $book->fresh()->total_copies);
    }

    public function test_a_borrowed_copy_cannot_be_removed_or_edited(): void
    {
        $book = $this->book(2);
        $librarian = $this->staff('librarian');
        $student = User::factory()->create([
            'user_role' => 'user',
            'is_active' => true,
            'school_id' => $this->school->id,
        ]);

        $copy = $book->copies()->orderBy('copy_number')->first();
        app(CirculationService::class)->borrowBook($student->id, $book->id, null, null, null, $copy->id);

        $this->actingAs($librarian)
            ->delete("/librarian/books/{$book->id}/copies/{$copy->id}")
            ->assertRedirect();
        $this->assertDatabaseHas('book_copies', ['id' => $copy->id]);

        $this->actingAs($librarian)
            ->put("/librarian/books/{$book->id}/copies/{$copy->id}", ['status' => 'available'])
            ->assertRedirect();
        $this->assertSame('borrowed', $copy->fresh()->status);
    }

    public function test_marking_a_copy_lost_takes_it_out_of_circulation(): void
    {
        $book = $this->book(2);

        $copy = $book->copies()->orderBy('copy_number')->first();
        $this->actingAs($this->staff('librarian'))
            ->put("/librarian/books/{$book->id}/copies/{$copy->id}", ['status' => 'lost', 'condition' => 'missing since Jan'])
            ->assertRedirect();

        $this->assertSame('lost', $copy->fresh()->status);
        $this->assertSame(1, $book->fresh()->available_copies);
        $this->assertSame(2, $book->fresh()->total_copies);

        // And it is no longer offered on the borrow screen.
        $this->actingAs($this->staff('librarian'))
            ->get('/librarian/circulation/borrow')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Circulation/Borrow')
                ->where('books.0.available_copies', 1)
                ->has('books.0.available_copies_list', 1)
            );
    }

    public function test_a_book_with_no_available_copies_is_not_offered_for_borrowing(): void
    {
        $book = $this->book(1);
        $book->copies()->update(['status' => 'lost']);
        app(\App\Services\BookCopyService::class)->refreshCounts($book);

        $this->actingAs($this->staff('librarian'))
            ->get('/librarian/circulation/borrow')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('books', 0));
    }

    public function test_the_return_screen_exposes_the_copy_on_each_loan(): void
    {
        $book = $this->book(2);
        $student = User::factory()->create([
            'user_role' => 'user',
            'is_active' => true,
            'school_id' => $this->school->id,
        ]);
        $copy = $book->copies()->orderBy('copy_number')->first();
        app(CirculationService::class)->borrowBook($student->id, $book->id, null, null, null, $copy->id);

        $this->actingAs($this->staff('librarian'))
            ->get('/librarian/circulation/return')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Circulation/Return')
                ->where('transactions.0.book_copy.qr_code', $copy->qr_code)
                ->where('transactions.0.book_copy.accession_number', $copy->accession_number)
            );
    }

    public function test_processing_a_return_with_the_wrong_scanned_copy_is_refused_over_http(): void
    {
        $book = $this->book(2);
        $librarian = $this->staff('librarian');
        $s1 = User::factory()->create(['user_role' => 'user', 'is_active' => true, 'school_id' => $this->school->id]);
        $s2 = User::factory()->create(['user_role' => 'user', 'is_active' => true, 'school_id' => $this->school->id]);

        $copy1 = $book->copies()->where('copy_number', 1)->first();
        $copy2 = $book->copies()->where('copy_number', 2)->first();

        $loan1 = app(CirculationService::class)->borrowBook($s1->id, $book->id, null, null, null, $copy1->id);
        app(CirculationService::class)->borrowBook($s2->id, $book->id, null, null, null, $copy2->id);

        $this->actingAs($librarian)
            ->from('/librarian/circulation/return')
            ->post('/librarian/circulation/return', [
                'transaction_id' => $loan1->id,
                'scanned_copy_qr' => "LIBTRACK:COPY:{$copy2->qr_code}",
            ])
            ->assertRedirect();

        $this->assertStringContainsString('Wrong copy', session('error'));
        $this->assertSame('active', $loan1->fresh()->status);
        $this->assertSame('borrowed', $copy1->fresh()->status);
        $this->assertSame('borrowed', $copy2->fresh()->status);
    }

    public function test_the_qr_lookup_api_resolves_a_copy_payload(): void
    {
        $book = $this->book(2);
        $copy = $book->copies()->orderBy('copy_number')->first();

        $this->actingAs($this->staff('librarian'))
            ->postJson('/api/qr/lookup', ['qr_data' => "LIBTRACK:COPY:{$copy->qr_code}"])
            ->assertOk()
            ->assertJsonPath('type', 'copy')
            ->assertJsonPath('data.accession_number', $copy->accession_number)
            ->assertJsonPath('data.book.id', $book->id);
    }

    public function test_the_qr_lookup_api_warns_on_a_title_only_payload(): void
    {
        $book = $this->book(2);
        // A title code that no copy carries (copy #1 has its own uuid here).
        $this->actingAs($this->staff('librarian'))
            ->postJson('/api/qr/lookup', ['qr_data' => "LIBTRACK:BOOK:{$book->qr_code}"])
            ->assertOk()
            ->assertJsonPath('type', 'book')
            ->assertJsonStructure(['warning']);
    }

    public function test_the_book_detail_page_lists_copies(): void
    {
        $book = $this->book(2);

        $this->actingAs($this->staff('librarian'))
            ->get("/librarian/books/{$book->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Books/Show')
                ->has('copies', 2)
                ->has('qrCode')
            );
    }

    public function test_creating_a_book_fans_out_its_copies(): void
    {
        $librarian = $this->staff('librarian');
        $category = Category::create(['name' => 'Filipino']);

        $this->actingAs($librarian)->post('/librarian/books', [
            'title' => 'Filipino 8',
            'author' => 'DepEd',
            'category_id' => $category->id,
            'total_copies' => 4,
        ])->assertRedirect(route('librarian.books.index'));

        $book = Book::where('title', 'Filipino 8')->first();
        $this->assertSame(4, $book->copies()->count());
        $this->assertSame(4, $book->available_copies);
        $this->assertSame(4, $book->copies()->pluck('qr_code')->unique()->count());
    }

    public function test_shrinking_total_copies_retires_only_copies_on_the_shelf(): void
    {
        $book = $this->book(3);
        $librarian = $this->staff('librarian');
        $student = User::factory()->create(['user_role' => 'user', 'is_active' => true, 'school_id' => $this->school->id]);

        $borrowed = $book->copies()->orderByDesc('copy_number')->first();
        app(CirculationService::class)->borrowBook($student->id, $book->id, null, null, null, $borrowed->id);

        // 3 -> 2: one free copy is retired, the borrowed one is untouched.
        $this->actingAs($librarian)->put("/librarian/books/{$book->id}", [
            'title' => $book->title,
            'author' => $book->author,
            'total_copies' => 2,
        ])->assertRedirect();

        $this->assertDatabaseHas('book_copies', ['id' => $borrowed->id, 'status' => 'borrowed']);
        $this->assertSame(2, $book->fresh()->copies()->count());
        $this->assertSame(2, $book->fresh()->total_copies);
        $this->assertSame(1, $book->fresh()->available_copies);
    }

    public function test_a_shrink_that_cannot_reach_the_target_is_reported_not_forced(): void
    {
        $book = $this->book(3);
        $librarian = $this->staff('librarian');

        // Two copies out on loan; only one is on the shelf to retire.
        foreach ([1, 2] as $n) {
            $student = User::factory()->create(['user_role' => 'user', 'is_active' => true, 'school_id' => $this->school->id]);
            $copy = $book->copies()->where('copy_number', $n)->first();
            app(CirculationService::class)->borrowBook($student->id, $book->id, null, null, null, $copy->id);
        }

        $this->actingAs($librarian)->put("/librarian/books/{$book->id}", [
            'title' => $book->title,
            'author' => $book->author,
            'total_copies' => 1,
        ])->assertRedirect();

        // Ends at 2, not 1 — and the librarian is told why rather than silently
        // losing a book that is physically with a student.
        $this->assertSame(2, $book->fresh()->copies()->count());
        $this->assertSame(2, $book->fresh()->total_copies);
        $this->assertSame(0, $book->fresh()->available_copies);
        $this->assertStringContainsString('could not be removed', session('success'));
    }

    public function test_a_replacement_copy_gets_a_fresh_qr_even_when_the_slot_is_reused(): void
    {
        // Retiring the highest copy frees its copy_number, so a later copy takes
        // the same slot and the same ACC-…-003 label. That is safe: a copy with
        // any borrowing history is never deletable, so no record points at the
        // retired label. What must NEVER be reused is the QR code itself —
        // that is the identifier circulation trusts.
        $book = $this->book(3);
        $librarian = $this->staff('librarian');
        $retired = $book->copies()->orderByDesc('copy_number')->first();
        $retiredQr = $retired->qr_code;

        $this->actingAs($librarian)->put("/librarian/books/{$book->id}", [
            'title' => $book->title,
            'author' => $book->author,
            'total_copies' => 2,
        ])->assertRedirect();

        $this->actingAs($librarian)->post("/librarian/books/{$book->id}/copies")->assertRedirect();

        $newest = $book->fresh()->copies()->orderByDesc('copy_number')->first();
        $this->assertNotSame($retiredQr, $newest->qr_code);

        // Live accession numbers stay unique.
        $live = BookCopy::pluck('accession_number');
        $this->assertSame($live->count(), $live->unique()->count());
    }

    public function test_accession_numbers_are_unique_across_books(): void
    {
        $a = $this->book(3);
        $b = $this->book(3);

        $all = BookCopy::pluck('accession_number');
        $this->assertSame($all->count(), $all->unique()->count());
        $this->assertNotSame(
            $a->copies()->first()->accession_number,
            $b->copies()->first()->accession_number,
        );
    }

    // ------------------------------------------------------------------
    //  Verification at the counter
    // ------------------------------------------------------------------

    public function test_borrowing_over_http_requires_naming_the_copy(): void
    {
        // Auto-assigning would bind the loan to a different physical book than
        // the one handed over, and the return scan would then rightly fail.
        $book = $this->book(3);
        $student = User::factory()->create(['user_role' => 'user', 'is_active' => true, 'school_id' => $this->school->id]);

        $this->actingAs($this->staff('librarian'))
            ->from('/librarian/circulation/borrow')
            ->post('/librarian/circulation/borrow', [
                'user_id' => $student->id,
                'book_id' => $book->id,
                'borrowed_at' => now()->toDateString(),
                'due_date' => now()->addDays(7)->toDateString(),
            ])
            ->assertSessionHasErrors('book_copy_id');

        $this->assertSame(0, $book->fresh()->transactions()->count());
    }

    public function test_an_unscanned_return_is_refused_unless_explicitly_overridden(): void
    {
        $book = $this->book(2);
        $student = User::factory()->create(['user_role' => 'user', 'is_active' => true, 'school_id' => $this->school->id]);
        $copy = $book->copies()->orderBy('copy_number')->first();
        $loan = app(CirculationService::class)->borrowBook($student->id, $book->id, null, null, null, $copy->id);

        $this->actingAs($this->staff('librarian'))
            ->from('/librarian/circulation/return')
            ->post('/librarian/circulation/return', ['transaction_id' => $loan->id])
            ->assertRedirect();

        $this->assertStringContainsString('Scan the copy', session('error'));
        $this->assertSame('active', $loan->fresh()->status);
        $this->assertSame('borrowed', $copy->fresh()->status);
    }

    public function test_an_overridden_return_succeeds_and_is_recorded_as_unverified(): void
    {
        $book = $this->book(2);
        $student = User::factory()->create(['user_role' => 'user', 'is_active' => true, 'school_id' => $this->school->id]);
        $copy = $book->copies()->orderBy('copy_number')->first();
        $loan = app(CirculationService::class)->borrowBook($student->id, $book->id, null, null, null, $copy->id);

        $this->actingAs($this->staff('librarian'))
            ->from('/librarian/circulation/return')
            ->post('/librarian/circulation/return', [
                'transaction_id' => $loan->id,
                'override_scan' => '1',
            ])
            ->assertRedirect();

        $loan->refresh();
        $this->assertSame('returned', $loan->status);
        $this->assertSame('available', $copy->fresh()->status);
        // The audit trail says the copy was never verified.
        $this->assertStringContainsString('without QR verification', (string) $loan->notes);
        $this->assertStringContainsString($copy->accession_number, (string) $loan->notes);
    }

    public function test_a_verified_return_is_not_marked_unverified(): void
    {
        $book = $this->book(2);
        $student = User::factory()->create(['user_role' => 'user', 'is_active' => true, 'school_id' => $this->school->id]);
        $copy = $book->copies()->orderBy('copy_number')->first();
        $loan = app(CirculationService::class)->borrowBook($student->id, $book->id, null, null, null, $copy->id);

        $this->actingAs($this->staff('librarian'))
            ->post('/librarian/circulation/return', [
                'transaction_id' => $loan->id,
                'scanned_copy_qr' => "LIBTRACK:COPY:{$copy->qr_code}",
            ])
            ->assertRedirect();

        $this->assertSame('returned', $loan->fresh()->status);
        $this->assertStringNotContainsString('without QR verification', (string) $loan->fresh()->notes);
    }

    // ------------------------------------------------------------------
    //  Copy bookkeeping
    // ------------------------------------------------------------------

    public function test_shrinking_retires_write_offs_before_shelf_ready_copies(): void
    {
        $book = $this->book(3);
        $librarian = $this->staff('librarian');

        // Copy 1 is damaged; copies 2 and 3 are fine.
        $damaged = $book->copies()->where('copy_number', 1)->first();
        $this->actingAs($librarian)
            ->put("/librarian/books/{$book->id}/copies/{$damaged->id}", ['status' => 'damaged'])
            ->assertRedirect();

        $this->actingAs($librarian)->put("/librarian/books/{$book->id}", [
            'title' => $book->title,
            'author' => $book->author,
            'total_copies' => 2,
        ])->assertRedirect();

        // The damaged copy goes, not a good one.
        $this->assertDatabaseMissing('book_copies', ['id' => $damaged->id]);
        $this->assertSame(2, $book->fresh()->available_copies);
    }

    public function test_book_status_names_the_real_reason_when_nothing_is_on_the_shelf(): void
    {
        $service = app(\App\Services\BookCopyService::class);

        $allDamaged = $this->book(2);
        $allDamaged->copies()->update(['status' => 'damaged']);
        $service->refreshCounts($allDamaged);
        $this->assertSame('damaged', $allDamaged->fresh()->status);

        $allLost = $this->book(2);
        $allLost->copies()->update(['status' => 'lost']);
        $service->refreshCounts($allLost);
        $this->assertSame('lost', $allLost->fresh()->status);

        // A mix that includes a loan still reads as borrowed.
        $mixed = $this->book(2);
        $mixed->copies()->where('copy_number', 1)->update(['status' => 'borrowed']);
        $mixed->copies()->where('copy_number', 2)->update(['status' => 'damaged']);
        $service->refreshCounts($mixed);
        $this->assertSame('borrowed', $mixed->fresh()->status);
    }

    public function test_total_copies_is_bounded(): void
    {
        $librarian = $this->staff('librarian');
        $category = Category::create(['name' => 'Bounded']);

        $this->actingAs($librarian)
            ->from('/librarian/books/create')
            ->post('/librarian/books', [
                'title' => 'Too Many',
                'author' => 'DepEd',
                'category_id' => $category->id,
                'total_copies' => 100000,
            ])
            ->assertSessionHasErrors('total_copies');

        $this->assertDatabaseMissing('books', ['title' => 'Too Many']);
    }
}
