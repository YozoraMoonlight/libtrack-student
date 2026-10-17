<?php

namespace Tests\Feature;

use App\Models\Book;
use App\Models\School;
use App\Services\BatchImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

/**
 * Book batch import — ISBN duplicate detection is scoped per school
 * (matches the books_school_id_isbn partial unique index).
 */
class BatchImportBooksTest extends TestCase
{
    use RefreshDatabase;

    private function csv(string $contents): UploadedFile
    {
        $tmp = tempnam(sys_get_temp_dir(), 'csv');
        file_put_contents($tmp, $contents);
        return new UploadedFile($tmp, 'books.csv', 'text/csv', null, true);
    }

    private function existingBook(int $schoolId, string $isbn): void
    {
        Book::create([
            'title' => 'Existing', 'author' => 'A', 'isbn' => $isbn,
            'school_id' => $schoolId, 'total_copies' => 1, 'available_copies' => 1,
            'status' => 'available', 'qr_code' => 'qr-' . $schoolId . '-' . $isbn,
        ]);
    }

    public function test_import_skips_duplicate_isbn_within_same_school(): void
    {
        $school = School::create(['code' => 'AAA', 'name' => 'Alpha', 'is_active' => true]);
        $this->existingBook($school->id, '111');

        $result = app(BatchImportService::class)->importBooks(
            $this->csv("title,author,isbn,category,total_copies\nDup,B,111,Fiction,2\nFresh,C,222,Fiction,1\n"),
            $school->id,
        );

        $this->assertSame(1, $result['imported']);
        $this->assertSame(1, $result['skipped']);
        $this->assertDatabaseHas('books', ['isbn' => '222', 'school_id' => $school->id]);
        $this->assertDatabaseMissing('books', ['title' => 'Dup']);
    }

    public function test_import_allows_same_isbn_for_a_different_school(): void
    {
        $schoolA = School::create(['code' => 'AAA', 'name' => 'Alpha', 'is_active' => true]);
        $schoolB = School::create(['code' => 'BBB', 'name' => 'Bravo', 'is_active' => true]);
        $this->existingBook($schoolA->id, '111');

        $result = app(BatchImportService::class)->importBooks(
            $this->csv("title,author,isbn,category,total_copies\nSameIsbn,B,111,Fiction,1\n"),
            $schoolB->id,
        );

        $this->assertSame(1, $result['imported']);
        $this->assertSame(0, $result['skipped']);
        $this->assertDatabaseHas('books', ['isbn' => '111', 'school_id' => $schoolB->id]);
    }
}
