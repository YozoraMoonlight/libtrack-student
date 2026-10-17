<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\Category;
use App\Models\Fine;
use App\Models\Transaction;
use App\Services\CirculationService;
use App\Services\QrCodeService;
use App\Support\PasswordRules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class StudentController extends Controller
{
    public function dashboard(Request $request)
    {
        $user = $request->user();
        $user->loadMissing('school:id,name,code');

        $stats = [
            'activeBorrows' => Transaction::where('user_id', $user->id)->where('status', 'active')->count(),
            'totalBorrowed' => Transaction::where('user_id', $user->id)->count(),
            'unpaidFines' => Fine::where('user_id', $user->id)->where('status', 'unpaid')->sum('amount'),
        ];

        $upcomingDue = Transaction::with('book')
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->orderBy('due_date', 'asc')
            ->take(5)
            ->get();

        $recentActivity = Transaction::with('book')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        $qrService = new QrCodeService();

        return response()->json([
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'student_id' => $user->student_id,
                'school_name' => $user->school?->name,
            ],
            'qrCode' => $qrService->generateBase64("LIBTRACK:USER:{$user->qr_code}"),
            'qrMime' => $qrService->getMimeType(),
            'stats' => $stats,
            'upcomingDue' => $upcomingDue,
            'recentActivity' => $recentActivity,
        ]);
    }

    public function books(Request $request)
    {
        $user = $request->user();

        $books = Book::with('category')
            ->when($user->school_id, fn ($q) => $q->where('school_id', $user->school_id))
            ->when(! $user->school_id, fn ($q) => $q->whereRaw('1 = 0'))
            ->search($request->search)
            ->filterByCategory($request->category_id)
            ->filterByStatus($request->status)
            ->orderBy('title')
            ->paginate(12)
            ->withQueryString();

        return response()->json([
            'books' => $books,
            'categories' => Category::orderBy('name')->get(),
            'filters' => $request->only(['search', 'category_id', 'status']),
        ]);
    }

    public function book(Request $request, Book $book)
    {
        $user = $request->user();

        if ($user->school_id && $book->school_id !== $user->school_id) {
            abort(404);
        }

        $book->load('category');

        $hasActiveBorrow = $book->transactions()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->exists();

        return response()->json([
            'book' => $book,
            'hasActiveBorrow' => $hasActiveBorrow,
        ]);
    }

    public function bookQr(Request $request, Book $book)
    {
        $user = $request->user();

        if ($user->school_id && $book->school_id !== $user->school_id) {
            abort(404);
        }

        $qrService = new QrCodeService();

        return response()->json([
            'mime' => $qrService->getMimeType(),
            'base64' => $qrService->generateBase64("LIBTRACK:BOOK:{$book->qr_code}"),
        ]);
    }

    public function borrowings(Request $request)
    {
        $user = $request->user();

        $borrowings = Transaction::with(['book.category', 'fines'])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

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

        return response()->json([
            'borrowings' => $borrowings,
            'activeLoans' => $activeLoans,
        ]);
    }

    public function requestReturn(Request $request, CirculationService $circulation)
    {
        $request->validate([
            'transaction_id' => 'nullable|integer',
            'scanned_qr' => 'nullable|string|max:255',
        ]);

        if (! $request->filled('transaction_id') && ! $request->filled('scanned_qr')) {
            return response()->json(['message' => 'Pick a book to return, or scan its QR label.'], 422);
        }

        try {
            $transaction = $circulation->requestReturn(
                $request->user(),
                $request->filled('transaction_id') ? $request->integer('transaction_id') : null,
                $request->scanned_qr
            );
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'ok' => true,
            'transaction_id' => $transaction->id,
            'message' => "Return requested for \"{$transaction->book?->title}\". Bring the book to the library.",
        ]);
    }

    public function cancelReturnRequest(Request $request, Transaction $transaction, CirculationService $circulation)
    {
        abort_unless($transaction->user_id === $request->user()->id, 404);

        try {
            $circulation->cancelReturnRequest($transaction);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['ok' => true]);
    }

    public function fines(Request $request)
    {
        $user = $request->user();

        $fines = Fine::with('transaction.book')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        $totalUnpaid = (float) Fine::where('user_id', $user->id)
            ->whereIn('status', ['unpaid', 'partial'])
            ->selectRaw('COALESCE(SUM(amount - paid_amount), 0) AS remaining')
            ->value('remaining');

        return response()->json([
            'fines' => $fines,
            'totalUnpaid' => $totalUnpaid,
        ]);
    }

    public function qrCard(Request $request)
    {
        $user = $request->user();
        $qrService = new QrCodeService();

        return response()->json([
            'mime' => $qrService->getMimeType(),
            'base64' => $qrService->generateBase64("LIBTRACK:USER:{$user->qr_code}"),
        ]);
    }

    public function updateProfile(Request $request)
    {
        $request->validate(['name' => ['required', 'string', 'max:255']]);

        $request->user()->update(['name' => $request->name]);

        return response()->json(['ok' => true, 'name' => $request->user()->name]);
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'password' => PasswordRules::strong(),
        ], PasswordRules::messages());

        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The provided password does not match your current password.'],
            ]);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return response()->json(['ok' => true]);
    }
}
