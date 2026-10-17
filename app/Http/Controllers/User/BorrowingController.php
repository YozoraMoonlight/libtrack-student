<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\CirculationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class BorrowingController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $borrowings = Transaction::with(['book.category', 'fines'])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        // Every book still out, unpaginated — the Return Books section must list
        // all of them, not just the ones on page 1 of the history. Mapped by hand
        // so the copy's QR code (what the desk verifies against) isn't shipped.
        $activeLoans = Transaction::with(['book', 'bookCopy'])
            ->where('user_id', $user->id)
            ->whereIn('status', ['active', 'overdue'])
            ->orderBy('due_date')
            ->get()
            ->map(fn (Transaction $t) => [
                'id' => $t->id,
                'book_title' => $t->book?->title,
                'book_author' => $t->book?->author,
                'accession_number' => $t->bookCopy?->accession_number,
                'borrowed_at' => $t->borrowed_at?->toIso8601String(),
                'due_date' => $t->due_date?->toIso8601String(),
                'status' => $t->status,
                'return_requested_at' => $t->return_requested_at?->toIso8601String(),
                'return_request_method' => $t->return_request_method,
            ]);

        return Inertia::render('User/Borrowings/Index', [
            'user' => ['name' => $user->name, 'email' => $user->email],
            'borrowings' => $borrowings,
            'activeLoans' => $activeLoans,
        ]);
    }

    /**
     * Ask to return a book, by picking it (transaction_id) or scanning its QR
     * label (scanned_qr). The loan stays open until a librarian receives it.
     */
    public function requestReturn(Request $request, CirculationService $circulation)
    {
        $request->validate([
            'transaction_id' => 'nullable|integer',
            'scanned_qr' => 'nullable|string|max:255',
        ]);

        if (!$request->filled('transaction_id') && !$request->filled('scanned_qr')) {
            return back()->with('error', 'Pick a book to return, or scan its QR label.');
        }

        try {
            $transaction = $circulation->requestReturn(
                Auth::user(),
                $request->filled('transaction_id') ? $request->integer('transaction_id') : null,
                $request->scanned_qr
            );
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with(
            'success',
            "Return requested for \"{$transaction->book?->title}\". Bring the book to the library — the librarian will confirm the return once they receive it."
        );
    }

    public function cancelReturnRequest(Transaction $transaction, CirculationService $circulation)
    {
        // Another student's loan is reported as missing, not forbidden.
        abort_unless($transaction->user_id === Auth::id(), 404);

        try {
            $circulation->cancelReturnRequest($transaction);
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Return request cancelled.');
    }
}
