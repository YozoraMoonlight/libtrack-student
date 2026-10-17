<?php

namespace App\Services;

use App\Models\Book;
use App\Models\BookCopy;
use Illuminate\Support\Facades\DB;

/**
 * Keeps a Book's physical copies and its denormalised counters in step.
 *
 * `books.total_copies` / `books.available_copies` stay as columns because
 * reports, dashboards and the inventory export all read them, but book_copies
 * is the source of truth — every write here re-derives them.
 */
class BookCopyService
{
    /**
     * Grow or shrink a book's copies until it has exactly $target of them.
     *
     * Shrinking only ever removes copies that are on the shelf, highest copy
     * number first. Copies that are borrowed (or flagged damaged/lost, which is
     * a record the library needs) are never silently destroyed — the count of
     * copies that could not be removed comes back as `blocked`.
     *
     * @return array{created:int, removed:int, blocked:int, total:int}
     */
    public function syncToTotal(Book $book, int $target): array
    {
        $target = max(1, $target);

        return DB::transaction(function () use ($book, $target) {
            $current = $book->copies()->count();
            $created = 0;
            $removed = 0;

            if ($current < $target) {
                $next = (int) $book->copies()->max('copy_number');
                for ($i = $current; $i < $target; $i++) {
                    $next++;
                    BookCopy::create([
                        'book_id' => $book->id,
                        'copy_number' => $next,
                        'status' => 'available',
                    ]);
                    $created++;
                }
            } elseif ($current > $target) {
                // Retire write-offs BEFORE shelf-ready copies. Removing an
                // 'available' copy while keeping one flagged damaged/lost would
                // shrink the usable stock and leave the broken book on the books.
                // Borrowed copies are excluded entirely — they are physically
                // with a student.
                $removable = $book->copies()
                    ->whereIn('status', ['lost', 'damaged', 'available'])
                    ->orderByRaw("case status when 'lost' then 0 when 'damaged' then 1 else 2 end")
                    ->orderByDesc('copy_number')
                    ->limit($current - $target)
                    ->get();

                foreach ($removable as $copy) {
                    // A copy that has ever been lent keeps its history; detaching
                    // it from the loan would orphan the transaction record.
                    if ($copy->transactions()->exists()) {
                        continue;
                    }
                    $copy->delete();
                    $removed++;
                }
            }

            $total = $this->refreshCounts($book);

            return [
                'created' => $created,
                'removed' => $removed,
                'blocked' => max(0, ($current - $target) - $removed),
                'total' => $total,
            ];
        });
    }

    /** Add one copy to the end of the run and return it. */
    public function addCopy(Book $book, array $attributes = []): BookCopy
    {
        return DB::transaction(function () use ($book, $attributes) {
            $copy = BookCopy::create(array_merge([
                'book_id' => $book->id,
                'copy_number' => ((int) $book->copies()->max('copy_number')) + 1,
                'status' => 'available',
            ], $attributes));

            $this->refreshCounts($book);

            return $copy;
        });
    }

    /**
     * Re-derive books.total_copies / available_copies / status from the copies.
     * Returns the new total.
     */
    public function refreshCounts(Book $book): int
    {
        $counts = $book->copies()
            ->selectRaw('count(*) as total')
            ->selectRaw("sum(case when status = 'available' then 1 else 0 end) as available")
            ->first();

        $total = (int) ($counts->total ?? 0);
        $available = (int) ($counts->available ?? 0);

        // books.status summarises the copies. With nothing on the shelf it must
        // name the actual reason — reporting "borrowed" for a title whose only
        // copies are damaged sends staff looking for a book nobody has.
        if ($available > 0) {
            $status = 'available';
        } elseif ($total === 0) {
            // No copies at all: nothing is lendable, and 'available' would be a lie.
            $status = 'lost';
        } else {
            $statuses = $book->copies()->pluck('status');

            $status = match (true) {
                $statuses->contains('borrowed') => 'borrowed',
                $statuses->contains('reserved') => 'reserved',
                $statuses->contains('damaged') => 'damaged',
                default => 'lost',
            };
        }

        $book->forceFill([
            'total_copies' => $total,
            'available_copies' => $available,
            'status' => $status,
        ])->save();

        return $total;
    }
}
