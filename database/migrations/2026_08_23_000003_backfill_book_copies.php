<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Materialise one book_copies row per physical copy of every existing title,
 * then attach every open loan to a distinct copy.
 *
 * Copy #1 deliberately INHERITS the title's existing books.qr_code so labels
 * already stuck on shelves keep resolving — they now resolve to exactly one
 * copy instead of matching every copy of the title. Copies 2..N get fresh
 * UUIDs and need their labels printed (Books → Copies → Print labels).
 *
 * Written with the query builder rather than Eloquent so later model changes
 * can't retroactively change what this migration did.
 */
return new class extends Migration
{
    public function up(): void
    {
        $books = DB::table('books')->orderBy('id')->get(['id', 'qr_code', 'total_copies', 'status']);

        foreach ($books as $book) {
            // Open loans that must each end up on their own copy.
            $openLoans = DB::table('transactions')
                ->where('book_id', $book->id)
                ->whereIn('status', ['active', 'overdue'])
                ->orderBy('borrowed_at')
                ->orderBy('id')
                ->pluck('id');

            // Never create fewer copies than there are books physically out:
            // total_copies can have drifted below the open-loan count.
            $copyCount = max(1, (int) $book->total_copies, $openLoans->count());

            // A title flagged damaged/lost describes its stock, so carry that
            // onto the copies that aren't accounted for by an open loan.
            $idleStatus = in_array($book->status, ['damaged', 'lost'], true)
                ? $book->status
                : 'available';

            $now = now();
            $copyIds = [];

            for ($n = 1; $n <= $copyCount; $n++) {
                $copyIds[] = DB::table('book_copies')->insertGetId([
                    'book_id' => $book->id,
                    'copy_number' => $n,
                    'accession_number' => sprintf('ACC-%05d-%03d', $book->id, $n),
                    // Copy #1 keeps the title's printed code.
                    'qr_code' => $n === 1 && $book->qr_code ? $book->qr_code : (string) Str::uuid(),
                    'status' => $idleStatus,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            // Hand out copies to open loans, oldest borrow first.
            foreach ($openLoans as $i => $transactionId) {
                $copyId = $copyIds[$i] ?? null;
                if ($copyId === null) {
                    continue;
                }

                DB::table('transactions')->where('id', $transactionId)->update(['book_copy_id' => $copyId]);
                DB::table('book_copies')->where('id', $copyId)->update([
                    'status' => 'borrowed',
                    'updated_at' => $now,
                ]);
            }

            // Re-derive the denormalised counters from the copies we just made.
            $available = DB::table('book_copies')
                ->where('book_id', $book->id)
                ->where('status', 'available')
                ->count();

            DB::table('books')->where('id', $book->id)->update([
                'total_copies' => $copyCount,
                'available_copies' => $available,
                'status' => $available > 0 ? 'available' : ($idleStatus === 'available' ? 'borrowed' : $idleStatus),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('transactions')->whereNotNull('book_copy_id')->update(['book_copy_id' => null]);
        DB::table('book_copies')->delete();
    }
};
