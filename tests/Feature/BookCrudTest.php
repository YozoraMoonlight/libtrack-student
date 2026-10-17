<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Category;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookCrudTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create([
            'user_role' => 'admin',
            'is_active' => true,
        ]);
    }

    private function librarian(?School $school = null): User
    {
        return User::factory()->create([
            'user_role' => 'librarian',
            'is_active' => true,
            'school_id' => $school?->id,
        ]);
    }

    private function school(array $overrides = []): School
    {
        static $counter = 0;
        $counter++;

        return School::create(array_merge([
            'name' => "School {$counter}",
            'code' => "SCH{$counter}",
            'is_active' => true,
        ], $overrides));
    }

    private function category(string $name = 'Fiction'): Category
    {
        return Category::create(['name' => $name]);
    }

    private function book(array $overrides = []): Book
    {
        return Book::create(array_merge([
            'title' => 'Default Title',
            'author' => 'Default Author',
            'total_copies' => 2,
            'available_copies' => 2,
        ], $overrides));
    }

    // -----------------------------------------------------------
    // Admin
    // -----------------------------------------------------------

    public function test_admin_can_view_books_index(): void
    {
        $admin = $this->admin();
        $school = $this->school();
        $this->book(['school_id' => $school->id, 'title' => 'Admin Sees This']);

        $this->actingAs($admin)
            ->get('/admin/books')
            ->assertOk();
    }

    public function test_admin_cannot_load_create_form(): void
    {
        // Books are librarian-only now — admins are read-only on the catalogue.
        $admin = $this->admin();
        $this->school();
        $this->category();

        $this->actingAs($admin)->get('/admin/books/create')->assertForbidden();
    }

    public function test_admin_cannot_create_book(): void
    {
        $admin = $this->admin();
        $school = $this->school();
        $category = $this->category();

        $this->actingAs($admin)->post('/admin/books', [
            'title' => 'Clean Code',
            'author' => 'Robert C. Martin',
            'isbn' => '978-0132350884',
            'category_id' => $category->id,
            'school_id' => $school->id,
            'total_copies' => 3,
        ])->assertForbidden();

        $this->assertDatabaseMissing('books', ['title' => 'Clean Code']);
    }

    public function test_admin_cannot_load_edit_form(): void
    {
        $admin = $this->admin();
        $school = $this->school();
        $book = $this->book(['school_id' => $school->id]);

        $this->actingAs($admin)->get("/admin/books/{$book->id}/edit")->assertForbidden();
    }

    public function test_admin_cannot_update_book(): void
    {
        $admin = $this->admin();
        $school = $this->school();
        $book = $this->book(['school_id' => $school->id, 'title' => 'Original']);

        $this->actingAs($admin)->put("/admin/books/{$book->id}", [
            'title' => 'Updated Title',
            'author' => $book->author,
            'school_id' => $school->id,
            'total_copies' => 5,
        ])->assertForbidden();

        $this->assertSame('Original', $book->fresh()->title);
    }

    public function test_admin_cannot_delete_book(): void
    {
        $admin = $this->admin();
        $book = $this->book(['school_id' => $this->school()->id]);

        $this->actingAs($admin)
            ->delete("/admin/books/{$book->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('books', ['id' => $book->id]);
    }

    public function test_admin_can_view_book_details(): void
    {
        // The admin has to be at the SAME school as the book — every non-super
        // admin is school-scoped. This previously created two separate schools
        // (school() makes a new one each call) and asserted 200 against a 403.
        $school = $this->school();
        $admin = $this->admin();
        $admin->update(['school_id' => $school->id]);
        $book = $this->book(['school_id' => $school->id]);

        $this->actingAs($admin)
            ->get("/admin/books/{$book->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Admin/Books/Show')
                ->where('book.id', $book->id)
                ->has('qrCode')
                // Every physical copy is listed, each with its own identifiers.
                ->has('copies', 2)
                ->has('copies.0.qr_code')
                ->has('copies.0.accession_number')
            );
    }

    // -----------------------------------------------------------
    // Librarian
    // -----------------------------------------------------------

    public function test_librarian_is_redirected_from_admin_prefix_to_librarian_prefix(): void
    {
        $school = $this->school();
        $librarian = $this->librarian($school);

        // GET /admin/books/create → redirects to /librarian/books/create
        $this->actingAs($librarian)
            ->get('/admin/books/create')
            ->assertRedirect('librarian/books/create');
    }

    public function test_librarian_can_load_create_form_without_white_screen(): void
    {
        $school = $this->school();
        $librarian = $this->librarian($school);
        $this->category();

        $response = $this->actingAs($librarian)->get('/librarian/books/create');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Books/Create')
            ->has('categories')
            ->where('schools', []) // librarian gets empty list
            ->where('currentUserSchool.id', $school->id)
            ->where('currentUserSchool.code', $school->code)
        );
    }

    public function test_librarian_create_pins_book_to_their_school(): void
    {
        $school = $this->school();
        $otherSchool = $this->school();
        $librarian = $this->librarian($school);
        $category = $this->category();

        // Librarian attempts to pass a different school_id — must be ignored.
        $this->actingAs($librarian)->post('/librarian/books', [
            'title' => 'Librarian Book',
            'author' => 'Someone',
            'category_id' => $category->id,
            'school_id' => $otherSchool->id,
            'total_copies' => 2,
        ])->assertRedirect(route('librarian.books.index'));

        $this->assertDatabaseHas('books', [
            'title' => 'Librarian Book',
            'school_id' => $school->id, // forced to librarian's school
        ]);
    }

    public function test_librarian_without_school_cannot_create_book(): void
    {
        $librarian = $this->librarian(); // no school assigned
        $this->category();

        $this->actingAs($librarian)->post('/librarian/books', [
            'title' => 'No School Librarian',
            'author' => 'Nobody',
            'total_copies' => 1,
        ])->assertForbidden();

        $this->assertDatabaseMissing('books', ['title' => 'No School Librarian']);
    }

    public function test_librarian_can_edit_own_school_book(): void
    {
        $school = $this->school();
        $librarian = $this->librarian($school);
        $book = $this->book(['school_id' => $school->id]);

        $this->actingAs($librarian)->get("/librarian/books/{$book->id}/edit")
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/Books/Edit'));
    }

    public function test_librarian_cannot_edit_other_schools_book(): void
    {
        $myschool = $this->school();
        $otherSchool = $this->school();
        $librarian = $this->librarian($myschool);
        $book = $this->book(['school_id' => $otherSchool->id]);

        $this->actingAs($librarian)
            ->get("/librarian/books/{$book->id}/edit")
            ->assertForbidden();
    }

    public function test_librarian_update_cannot_move_book_between_schools(): void
    {
        $school = $this->school();
        $otherSchool = $this->school();
        $librarian = $this->librarian($school);
        $book = $this->book(['school_id' => $school->id]);

        $this->actingAs($librarian)->put("/librarian/books/{$book->id}", [
            'title' => 'Updated',
            'author' => $book->author,
            'school_id' => $otherSchool->id, // must be ignored
            'total_copies' => $book->total_copies,
        ])->assertRedirect(route('librarian.books.index'));

        $this->assertSame($school->id, $book->fresh()->school_id);
        $this->assertSame('Updated', $book->fresh()->title);
    }

    public function test_librarian_can_delete_own_school_book(): void
    {
        $school = $this->school();
        $librarian = $this->librarian($school);
        $book = $this->book(['school_id' => $school->id]);

        $this->actingAs($librarian)
            ->delete("/librarian/books/{$book->id}")
            ->assertRedirect(route('librarian.books.index'));

        $this->assertDatabaseMissing('books', ['id' => $book->id]);
    }

    public function test_librarian_cannot_delete_other_schools_book(): void
    {
        $myschool = $this->school();
        $otherSchool = $this->school();
        $librarian = $this->librarian($myschool);
        $book = $this->book(['school_id' => $otherSchool->id]);

        $this->actingAs($librarian)
            ->delete("/librarian/books/{$book->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('books', ['id' => $book->id]);
    }

    public function test_librarian_update_adjusts_available_copies(): void
    {
        $school = $this->school();
        $librarian = $this->librarian($school);
        $book = $this->book([
            'school_id' => $school->id,
            'total_copies' => 3,
        ]);

        // available_copies is derived from book_copies now, so "2 already
        // borrowed" has to be expressed as two copies actually off the shelf
        // rather than by writing the counter directly.
        $book->copies()->orderBy('copy_number')->take(2)->get()
            ->each(fn ($copy) => $copy->update(['status' => 'borrowed']));
        app(\App\Services\BookCopyService::class)->refreshCounts($book);
        $this->assertSame(1, $book->fresh()->available_copies);

        $this->actingAs($librarian)->put("/librarian/books/{$book->id}", [
            'title' => 'Updated Title',
            'author' => $book->author,
            'total_copies' => 5, // +2
        ])->assertRedirect(route('librarian.books.index'));

        $book->refresh();
        $this->assertSame('Updated Title', $book->title);
        $this->assertSame(5, $book->total_copies);
        $this->assertSame(3, $book->available_copies); // 1 + (5-3)
        $this->assertSame(5, $book->copies()->count());
    }

    // -----------------------------------------------------------
    // ISBN uniqueness (per school)
    // -----------------------------------------------------------

    public function test_cannot_create_book_with_duplicate_isbn_in_same_school(): void
    {
        $school = $this->school();
        $librarian = $this->librarian($school);
        $category = $this->category();
        $this->book(['school_id' => $school->id, 'isbn' => '978-0132350884']);

        $this->actingAs($librarian)->post('/librarian/books', [
            'title' => 'Another Book',
            'author' => 'Someone',
            'isbn' => '978-0132350884',
            'category_id' => $category->id,
            'total_copies' => 1,
        ])->assertSessionHasErrors('isbn');
    }

    public function test_can_create_same_isbn_in_different_schools(): void
    {
        $schoolA = $this->school();
        $schoolB = $this->school();
        $librarianB = $this->librarian($schoolB);
        $this->book(['school_id' => $schoolA->id, 'isbn' => '111-1']);

        $this->actingAs($librarianB)->post('/librarian/books', [
            'title' => 'Same ISBN Other School',
            'author' => 'Someone',
            'isbn' => '111-1',
            'total_copies' => 1,
        ])->assertRedirect(route('librarian.books.index'));

        $this->assertDatabaseHas('books', ['isbn' => '111-1', 'school_id' => $schoolB->id]);
    }

    public function test_update_keeping_own_isbn_is_allowed(): void
    {
        $school = $this->school();
        $librarian = $this->librarian($school);
        $book = $this->book(['school_id' => $school->id, 'isbn' => '222-2']);

        $this->actingAs($librarian)->put("/librarian/books/{$book->id}", [
            'title' => 'Renamed',
            'author' => $book->author,
            'isbn' => '222-2', // unchanged — must not trip the unique rule
            'total_copies' => $book->total_copies,
        ])->assertRedirect(route('librarian.books.index'));

        $this->assertSame('Renamed', $book->fresh()->title);
    }

    public function test_multiple_books_without_isbn_allowed_in_same_school(): void
    {
        $school = $this->school();
        $librarian = $this->librarian($school);

        $this->actingAs($librarian)->post('/librarian/books', [
            'title' => 'No ISBN One', 'author' => 'A', 'total_copies' => 1,
        ])->assertRedirect();
        $this->actingAs($librarian)->post('/librarian/books', [
            'title' => 'No ISBN Two', 'author' => 'B', 'total_copies' => 1,
        ])->assertRedirect();

        $this->assertDatabaseHas('books', ['title' => 'No ISBN One', 'school_id' => $school->id]);
        $this->assertDatabaseHas('books', ['title' => 'No ISBN Two', 'school_id' => $school->id]);
    }

    // -----------------------------------------------------------
    // Guest
    // -----------------------------------------------------------

    public function test_guest_cannot_access_admin_books(): void
    {
        $this->get('/admin/books/create')->assertRedirect('/student/login');
    }
}
