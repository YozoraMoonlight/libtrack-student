<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\Category;
use App\Models\Fine;
use App\Models\School;
use App\Models\User;
use App\Services\CirculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Found in the 2026-09-16 run-through: every search box that used Postgres-only
 * `ilike` threw a SQL syntax error on SQLite — the student's Browse Books search
 * 500'd locally. The search must stay case-insensitive on both databases.
 */
class SearchFiltersTest extends TestCase
{
    use RefreshDatabase;

    protected School $school;
    protected User $student;
    protected Book $book;

    protected function setUp(): void
    {
        parent::setUp();
        $this->school = School::create(['code' => 'SRC', 'name' => 'Search National High', 'address' => 'Cotabato City', 'is_active' => true]);
        $this->student = User::create([
            'name' => 'Angela Rose Hernandez', 'email' => 'angela@example.com', 'password' => Hash::make('Password123!'),
            'user_role' => 'user', 'school_id' => $this->school->id, 'is_active' => true,
        ]);
        $this->book = Book::create([
            'title' => 'The Great Gatsby', 'author' => 'F. Scott Fitzgerald', 'isbn' => '978-0-7432-7356-5',
            'category_id' => Category::create(['name' => 'Classics'])->id, 'school_id' => $this->school->id,
            'total_copies' => 1, 'available_copies' => 1, 'status' => 'available',
        ]);
        Book::create([
            'title' => 'Calculus', 'author' => 'Stewart', 'category_id' => Category::create(['name' => 'Math'])->id,
            'school_id' => $this->school->id, 'total_copies' => 1, 'available_copies' => 1, 'status' => 'available',
        ]);
    }

    private function staff(string $role): User
    {
        return User::create([
            'name' => ucfirst($role), 'email' => "{$role}@example.com", 'password' => Hash::make('Password123!'),
            'user_role' => $role, 'school_id' => $role === 'super_admin' ? null : $this->school->id, 'is_active' => true,
        ]);
    }

    public function test_student_book_search_is_case_insensitive(): void
    {
        $this->actingAs($this->student)
            ->get(route('user.books.index', ['search' => 'gATSby']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('books.data', 1)->where('books.data.0.title', 'The Great Gatsby'));

        $this->actingAs($this->student)
            ->get(route('user.books.index', ['search' => 'fitzGERALD']))
            ->assertInertia(fn ($page) => $page->has('books.data', 1));
    }

    public function test_circulation_search_matches_borrower_or_title(): void
    {
        app(CirculationService::class)->borrowBook($this->student->id, $this->book->id);
        $librarian = $this->staff('librarian');

        $this->actingAs($librarian)
            ->get(route('librarian.circulation.index', ['search' => 'HERNANDEZ']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('transactions.data', 1));

        $this->actingAs($librarian)
            ->get(route('librarian.circulation.index', ['search' => 'gatsby']))
            ->assertInertia(fn ($page) => $page->has('transactions.data', 1));

        $this->actingAs($librarian)
            ->get(route('librarian.circulation.index', ['search' => 'nobody']))
            ->assertInertia(fn ($page) => $page->has('transactions.data', 0));
    }

    public function test_fines_search_matches_student_name_or_email(): void
    {
        Fine::create(['user_id' => $this->student->id, 'amount' => 20, 'type' => 'damaged', 'status' => 'unpaid', 'description' => 'Torn cover']);
        $librarian = $this->staff('librarian');

        $this->actingAs($librarian)
            ->get(route('librarian.fines.index', ['search' => 'ANGELA']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('fines.data', 1));
    }

    public function test_school_search_is_case_insensitive(): void
    {
        $this->actingAs($this->staff('super_admin'))
            ->get(route('admin.schools.index', ['search' => 'cotabato']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('schools.data', 1));
    }
}
