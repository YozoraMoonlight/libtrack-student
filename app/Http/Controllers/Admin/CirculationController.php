<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\Transaction;
use App\Models\User;
use App\Services\CirculationService;
use App\Services\SettingsService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CirculationController extends Controller
{
    protected CirculationService $circulationService;
    protected SettingsService $settingsService;

    public function __construct(CirculationService $circulationService, SettingsService $settingsService)
    {
        $this->circulationService = $circulationService;
        $this->settingsService = $settingsService;
    }

    public function index(Request $request)
    {
        $auth = Auth::user();

        $query = Transaction::with(['user', 'book', 'bookCopy', 'librarian'])
            ->when(!$auth->isSuperAdmin(), fn ($q) => $q->whereHas('book', fn ($b) => $b->where('school_id', $auth->school_id)));

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->search) {
            // Portable case-insensitive match (Postgres-only `ilike` 500s on SQLite).
            $like = '%' . mb_strtolower($request->search) . '%';
            $query->where(function ($q) use ($like) {
                $q->whereHas('user', fn ($u) => $u->whereRaw('lower(name) like ?', [$like]))
                  ->orWhereHas('book', fn ($b) => $b->whereRaw('lower(title) like ?', [$like]));
            });
        }

        $transactions = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        // Students who asked to return a book from their own page. Surfaced here
        // so the desk notices them without opening the Return screen first.
        $pendingReturnRequests = Transaction::whereNotNull('return_requested_at')
            ->whereIn('status', ['active', 'overdue'])
            ->when(!$auth->isSuperAdmin(), fn ($q) => $q->whereHas('book', fn ($b) => $b->where('school_id', $auth->school_id)))
            ->count();

        return Inertia::render('Admin/Circulation/Index', [
            'transactions' => $transactions,
            'filters' => $request->only(['search', 'status']),
            'pendingReturnRequests' => $pendingReturnRequests,
        ]);
    }

    public function borrow()
    {
        $auth = Auth::user();

        $users = User::where('is_active', true)
            ->where('user_role', 'user')
            ->when(!$auth->isSuperAdmin(), fn ($q) => $q->where('school_id', $auth->school_id))
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'student_id', 'qr_code', 'school_id']);

        // Only titles with at least one copy on the shelf, each shipped with
        // its available copies so the browser can resolve a scanned copy QR.
        $books = Book::whereHas('copies', fn ($q) => $q->where('status', 'available'))
            ->when(!$auth->isSuperAdmin(), fn ($q) => $q->where('school_id', $auth->school_id))
            ->with(['availableCopies' => fn ($q) => $q->orderBy('copy_number')])
            ->orderBy('title')
            ->get(['id', 'title', 'author', 'isbn', 'available_copies', 'qr_code', 'school_id']);

        // Serialised under `available_copies_list`, NOT the relation's default
        // snake_case key — that would be `available_copies` and would overwrite
        // the integer count column of the same name.
        $books = $books->map(function (Book $book) {
            $copies = $book->availableCopies->map(fn ($c) => [
                'id' => $c->id,
                'copy_number' => $c->copy_number,
                'accession_number' => $c->accession_number,
                'qr_code' => $c->qr_code,
                'status' => $c->status,
            ])->values();

            return [
                'id' => $book->id,
                'title' => $book->title,
                'author' => $book->author,
                'isbn' => $book->isbn,
                'qr_code' => $book->qr_code,
                'school_id' => $book->school_id,
                'available_copies' => $copies->count(),
                'available_copies_list' => $copies,
            ];
        });

        $borrowDuration = 1;

        return Inertia::render('Admin/Circulation/Borrow', [
            'users' => $users,
            'books' => $books,
            'borrowDuration' => $borrowDuration,
        ]);
    }

    public function processBorrow(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'book_id' => 'required|exists:books,id',
            // REQUIRED at the counter. Auto-assigning a copy would bind the loan
            // to a different physical book than the one handed over, and the
            // return scan would then legitimately fail. (The service still
            // accepts null for programmatic callers such as seeders.)
            'book_copy_id' => 'required|exists:book_copies,id',
            'borrowed_at' => 'required|date',
            'due_date' => 'required|date|after_or_equal:borrowed_at',
        ]);

        $auth = Auth::user();
        $student = User::findOrFail($request->user_id);
        $book = Book::findOrFail($request->book_id);

        if (!$auth->isSuperAdmin()) {
            if ($book->school_id !== $auth->school_id || $student->school_id !== $auth->school_id) {
                return back()->with('error', 'Borrower and book must belong to your school.');
            }
        }

        if ($student->school_id && $book->school_id && $student->school_id !== $book->school_id) {
            return back()->with('error', 'Student and book belong to different schools.');
        }

        try {
            $this->circulationService->borrowBook(
                $request->user_id,
                $request->book_id,
                Auth::id(),
                $request->borrowed_at,
                $request->due_date,
                $request->book_copy_id ? (int) $request->book_copy_id : null
            );

            return redirect()->route($auth->isLibrarian() ? 'librarian.circulation.index' : 'admin.circulation.index')
                ->with('success', 'Book borrowed successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function returnForm()
    {
        $auth = Auth::user();

        $transactions = Transaction::with(['user', 'book', 'bookCopy'])
            ->whereIn('status', ['active', 'overdue'])
            ->when(!$auth->isSuperAdmin(), fn ($q) => $q->whereHas('book', fn ($b) => $b->where('school_id', $auth->school_id)))
            ->orderBy('due_date', 'asc')
            ->get();

        return Inertia::render('Admin/Circulation/Return', [
            'transactions' => $transactions,
        ]);
    }

    public function processReturn(Request $request)
    {
        $request->validate([
            'transaction_id' => 'required|exists:transactions,id',
            // Set when the librarian returned by scanning. The service refuses
            // the return if it isn't the copy this loan was issued on.
            'scanned_copy_qr' => 'nullable|string|max:255',
            // Deliberate escape hatch for a damaged or missing label. Recorded
            // on the transaction so an unverified return is auditable.
            'override_scan' => 'nullable|boolean',
            // The student's own QR, when the librarian scanned it. Must be the
            // borrower's; it narrows the desk to their loans but does not by
            // itself prove which book came back.
            'scanned_user_qr' => 'nullable|string|max:255',
        ]);

        // Scanning is what proves the right physical book came back. Skipping it
        // has to be an explicit choice, not the default path.
        if (!$request->filled('scanned_copy_qr') && !$request->boolean('override_scan')) {
            return back()->with('error', 'Scan the copy being returned, or confirm the return without a scan if its label is unreadable.');
        }

        $auth = Auth::user();
        $transaction = Transaction::with('book')->findOrFail($request->transaction_id);

        if (!$auth->isSuperAdmin() && $transaction->book?->school_id !== $auth->school_id) {
            return back()->with('error', 'This transaction belongs to another school.');
        }

        try {
            $this->circulationService->returnBook(
                $request->transaction_id,
                Auth::id(),
                $request->scanned_copy_qr,
                $request->boolean('override_scan'),
                $request->scanned_user_qr
            );

            // Stay on the Return screen so the active-borrows list refreshes in
            // place (the returned book drops off) and several books can be
            // returned in a row without a manual page refresh.
            return redirect()->route($auth->isLibrarian() ? 'librarian.circulation.return' : 'admin.circulation.return')
                ->with('success', 'Book returned successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function show(Transaction $transaction)
    {
        $auth = Auth::user();
        $transaction->load(['user', 'book', 'bookCopy', 'librarian', 'fines']);

        if (!$auth->isSuperAdmin() && $transaction->book?->school_id !== $auth->school_id) {
            abort(403, 'This transaction belongs to another school.');
        }

        return Inertia::render('Admin/Circulation/Show', [
            'transaction' => $transaction,
        ]);
    }

    public function updateDates(Request $request, Transaction $transaction)
    {
        $request->validate([
            'borrowed_at' => 'required|date',
            'due_date' => 'required|date|after_or_equal:borrowed_at',
        ]);

        $auth = Auth::user();
        if (!$auth->isSuperAdmin() && $transaction->book?->school_id !== $auth->school_id) {
            abort(403, 'This transaction belongs to another school.');
        }

        $transaction->update([
            'borrowed_at' => Carbon::parse($request->borrowed_at),
            'due_date' => Carbon::parse($request->due_date),
        ]);

        return back()->with('success', 'Transaction dates updated successfully.');
    }
}
