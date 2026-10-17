<?php

namespace Database\Seeders;

use App\Models\Book;
use App\Models\BookCopy;
use App\Models\Fine;
use App\Models\Reservation;
use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class TransactionSeeder extends Seeder
{
    public function run(): void
    {
        $students = User::where('user_role', 'user')->get();
        $librarian = User::where('user_role', 'librarian')->first();
        $books = Book::where('available_copies', '>', 0)->get();

        if ($students->isEmpty() || $books->isEmpty()) {
            return;
        }

        // --- Active borrows (currently checked out) ---
        $activeBorrows = [
            ['student_idx' => 0, 'book_idx' => 0, 'days_ago' => 3],
            ['student_idx' => 0, 'book_idx' => 5, 'days_ago' => 7],
            ['student_idx' => 1, 'book_idx' => 2, 'days_ago' => 5],
            ['student_idx' => 1, 'book_idx' => 10, 'days_ago' => 1],
            ['student_idx' => 2, 'book_idx' => 8, 'days_ago' => 10],
        ];

        foreach ($activeBorrows as $borrow) {
            $student = $students[$borrow['student_idx']] ?? $students->first();
            $book = $books[$borrow['book_idx']] ?? $books->random();

            $borrowedAt = Carbon::now()->subDays($borrow['days_ago']);

            $copy = $this->takeCopy($book);
            if (!$copy) {
                continue;
            }

            Transaction::create([
                'user_id' => $student->id,
                'book_id' => $book->id,
                'book_copy_id' => $copy->id,
                'librarian_id' => $librarian?->id,
                'type' => 'borrow',
                'borrowed_at' => $borrowedAt,
                'due_date' => $borrowedAt->copy()->addDays(14),
                'status' => 'active',
            ]);
        }

        // --- Overdue borrows (past due, still active) ---
        $overdueBorrows = [
            ['student_idx' => 2, 'book_idx' => 15, 'days_ago' => 20],
            ['student_idx' => 0, 'book_idx' => 18, 'days_ago' => 18],
        ];

        foreach ($overdueBorrows as $borrow) {
            $student = $students[$borrow['student_idx']] ?? $students->first();
            $book = $books[$borrow['book_idx']] ?? $books->random();

            $borrowedAt = Carbon::now()->subDays($borrow['days_ago']);
            $dueDate = $borrowedAt->copy()->addDays(14);

            $copy = $this->takeCopy($book);
            if (!$copy) {
                continue;
            }

            $transaction = Transaction::create([
                'user_id' => $student->id,
                'book_id' => $book->id,
                'book_copy_id' => $copy->id,
                'librarian_id' => $librarian?->id,
                'type' => 'borrow',
                'borrowed_at' => $borrowedAt,
                'due_date' => $dueDate,
                'status' => 'overdue',
            ]);

            // Create fine for overdue
            $daysOverdue = (int) $dueDate->diffInDays(Carbon::now());
            Fine::create([
                'user_id' => $student->id,
                'transaction_id' => $transaction->id,
                'type' => 'overdue',
                'amount' => $daysOverdue * 5.00,
                'description' => "Overdue by {$daysOverdue} day(s) at 5.00/day",
            ]);
        }

        // --- Returned transactions (completed) ---
        $returnedBorrows = [
            ['student_idx' => 0, 'book_idx' => 3, 'borrowed_days_ago' => 25, 'returned_days_ago' => 12],
            ['student_idx' => 1, 'book_idx' => 7, 'borrowed_days_ago' => 30, 'returned_days_ago' => 18],
            ['student_idx' => 2, 'book_idx' => 12, 'borrowed_days_ago' => 20, 'returned_days_ago' => 8],
            ['student_idx' => 1, 'book_idx' => 1, 'borrowed_days_ago' => 15, 'returned_days_ago' => 5],
        ];

        foreach ($returnedBorrows as $borrow) {
            $student = $students[$borrow['student_idx']] ?? $students->first();
            $book = $books[$borrow['book_idx']] ?? $books->random();

            $borrowedAt = Carbon::now()->subDays($borrow['borrowed_days_ago']);
            $dueDate = $borrowedAt->copy()->addDays(14);
            $returnedAt = Carbon::now()->subDays($borrow['returned_days_ago']);

            $transaction = Transaction::create([
                'user_id' => $student->id,
                'book_id' => $book->id,
                // Already back on the shelf, so the copy stays 'available'.
                'book_copy_id' => $book->copies()->where('status', 'available')->value('id'),
                'librarian_id' => $librarian?->id,
                'type' => 'borrow',
                'borrowed_at' => $borrowedAt,
                'due_date' => $dueDate,
                'returned_at' => $returnedAt,
                'status' => 'returned',
            ]);

            // If it was returned late, create a paid fine
            if ($returnedAt->gt($dueDate)) {
                $daysOverdue = (int) $dueDate->diffInDays($returnedAt);
                Fine::create([
                    'user_id' => $student->id,
                    'transaction_id' => $transaction->id,
                    'type' => 'overdue',
                    'amount' => $daysOverdue * 5.00,
                    'paid_amount' => $daysOverdue * 5.00,
                    'status' => 'paid',
                    'paid_at' => $returnedAt,
                    'description' => "Overdue by {$daysOverdue} day(s) at 5.00/day (paid)",
                ]);
            }
        }

        // --- Pending reservations ---
        $reservationBooks = Book::where('available_copies', 0)->take(2)->get();
        if ($reservationBooks->count() < 2) {
            $reservationBooks = $books->take(2);
        }

        foreach ($reservationBooks as $i => $book) {
            $student = $students[$i] ?? $students->first();
            Reservation::create([
                'user_id' => $student->id,
                'book_id' => $book->id,
                'status' => 'pending',
                'reserved_at' => Carbon::now()->subDays(2 - $i),
                'expires_at' => Carbon::now()->addHours(48),
            ]);
        }
    }

    /**
     * Move the lowest-numbered available copy of $book off the shelf and
     * re-derive the title's counters. Returns null when nothing is available.
     */
    private function takeCopy(Book $book): ?BookCopy
    {
        $copy = $book->copies()
            ->where('status', 'available')
            ->orderBy('copy_number')
            ->first();

        if (!$copy) {
            return null;
        }

        $copy->update(['status' => 'borrowed']);
        app(\App\Services\BookCopyService::class)->refreshCounts($book);

        return $copy;
    }
}
