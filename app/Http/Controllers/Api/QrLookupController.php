<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\User;
use Illuminate\Http\Request;

class QrLookupController extends Controller
{
    public function lookup(Request $request)
    {
        $request->validate(['qr_data' => 'required|string']);

        $data = $request->qr_data;

        // Parse QR format: LIBTRACK:COPY:{uuid}, LIBTRACK:BOOK:{uuid} or LIBTRACK:USER:{uuid}.
        // COPY is the current format; BOOK is the legacy title-level label that
        // the backfill mapped onto copy #1 of each title, so both resolve to a
        // single physical copy.
        if (str_starts_with($data, 'LIBTRACK:COPY:') || str_starts_with($data, 'LIBTRACK:BOOK:')) {
            $uuid = trim(substr($data, strlen('LIBTRACK:COPY:')));

            $copy = BookCopy::with('book.category')->where('qr_code', $uuid)->first();

            if ($copy) {
                return response()->json([
                    'type' => 'copy',
                    'data' => [
                        'id' => $copy->id,
                        'copy_number' => $copy->copy_number,
                        'accession_number' => $copy->accession_number,
                        'qr_code' => $copy->qr_code,
                        'status' => $copy->status,
                        'book' => $copy->book,
                    ],
                ]);
            }

            // A title-level code with no matching copy: report the title so the
            // operator knows what they scanned, and that its labels need reprinting.
            $book = Book::where('qr_code', $uuid)->with('category')->first();

            if (!$book) {
                return response()->json(['error' => 'Book not found'], 404);
            }

            return response()->json([
                'type' => 'book',
                'data' => $book,
                'warning' => 'This is a title-level QR code with no copy attached. Reprint the copy labels from Books → Copies.',
            ]);
        }

        if (str_starts_with($data, 'LIBTRACK:USER:')) {
            $uuid = str_replace('LIBTRACK:USER:', '', $data);
            $user = User::where('qr_code', $uuid)->first();

            if (!$user) {
                return response()->json(['error' => 'User not found'], 404);
            }

            return response()->json(['type' => 'user', 'data' => $user]);
        }

        return response()->json(['error' => 'Invalid QR code format'], 400);
    }
}
