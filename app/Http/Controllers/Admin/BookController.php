<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreBookRequest;
use App\Http\Requests\Admin\UpdateBookRequest;
use App\Models\Book;
use App\Models\Category;
use App\Models\School;
use App\Services\BookCopyService;
use App\Services\QrCodeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class BookController extends Controller
{
    public function __construct(protected BookCopyService $copies)
    {
    }

    public function index(Request $request)
    {
        $user = Auth::user();

        $books = Book::with(['category', 'school:id,name,code'])
            ->search($request->search)
            ->filterByCategory($request->category_id)
            ->filterByStatus($request->status)
            // School-scoped users (school admins + librarians) only ever see their
            // own school's books. Only the super admin sees every school and may
            // narrow the list with the ?school_id filter.
            ->when(!$user->isSuperAdmin(), fn ($q) => $q->where('school_id', $user->school_id))
            ->when($user->isSuperAdmin() && $request->school_id, fn ($q) => $q->where('school_id', $request->school_id))
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Admin/Books/Index', [
            'books' => $books,
            'categories' => Category::orderBy('name')->get(),
            'schools' => $user->isSuperAdmin()
                ? School::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code'])
                : [],
            'filters' => $request->only(['search', 'category_id', 'status', 'school_id']),
        ]);
    }

    public function create()
    {
        // Only librarians add books (panel requirement). create() has no
        // FormRequest, so the gate lives here; store() is gated by StoreBookRequest.
        abort_unless(Auth::user()->isLibrarian(), 403, 'Only librarians can add books.');

        $user = Auth::user();

        return Inertia::render('Admin/Books/Create', [
            'categories' => Category::orderBy('name')->get(),
            'schools' => $user->isAdmin()
                ? School::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code'])
                : [],
            'currentUserSchool' => $user->school_id ? $user->school()->first(['id', 'name', 'code']) : null,
        ]);
    }

    public function store(StoreBookRequest $request)
    {
        $user = Auth::user();
        $data = $request->validated();

        // School admins and librarians are pinned to their own school — the form
        // doesn't expose a school picker for them, so force-set it server-side.
        if ($user->user_role === 'school_admin' || $user->isLibrarian()) {
            abort_unless($user->school_id, 403, 'Your account is not assigned to a school. Contact an administrator.');
            $data['school_id'] = $user->school_id;
        }

        if ($request->hasFile('cover_image')) {
            $data['cover_image'] = $request->file('cover_image')->store('book-covers', 'public');
        }

        $data['available_copies'] = $data['total_copies'];

        // Book::created fans this out into one book_copies row per copy, each
        // with its own QR code.
        $book = Book::create($data);

        return redirect()->route($user->isLibrarian() ? 'librarian.books.index' : 'admin.books.index')
            ->with('success', "Book added successfully with {$book->total_copies} copy label(s) ready to print.");
    }

    public function show(Book $book)
    {
        $this->authorizeSchoolAccess($book);

        $book->load([
            'category',
            'school:id,name,code',
            'transactions.user',
            'copies' => fn ($q) => $q->orderBy('copy_number'),
            'copies.activeTransaction.user:id,name',
        ]);

        $qrService = new QrCodeService();

        return Inertia::render('Admin/Books/Show', [
            'book' => $book,
            // Title-level code. Kept for reference only — circulation scans copies.
            'qrCode' => $qrService->generateBase64("LIBTRACK:BOOK:{$book->qr_code}"),
            'copies' => $book->copies->map(fn ($copy) => [
                'id' => $copy->id,
                'copy_number' => $copy->copy_number,
                'accession_number' => $copy->accession_number,
                'qr_code' => $copy->qr_code,
                'status' => $copy->status,
                'condition' => $copy->condition,
                'borrower' => $copy->activeTransaction?->user?->name,
            ]),
        ]);
    }

    public function edit(Book $book)
    {
        // Only librarians manage books — admins are read-only on the catalogue.
        abort_unless(Auth::user()->isLibrarian(), 403, 'Only librarians can edit books.');

        $this->authorizeSchoolAccess($book);
        $user = Auth::user();

        return Inertia::render('Admin/Books/Edit', [
            'book' => $book,
            'categories' => Category::orderBy('name')->get(),
            'schools' => $user->isAdmin()
                ? School::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code'])
                : [],
        ]);
    }

    public function update(UpdateBookRequest $request, Book $book)
    {
        $this->authorizeSchoolAccess($book);
        $user = Auth::user();
        $data = $request->validated();

        if ($user->user_role === 'school_admin' || $user->isLibrarian()) {
            // School admins and librarians cannot reassign books to other schools.
            unset($data['school_id']);
        }

        if ($request->hasFile('cover_image')) {
            if ($book->cover_image) {
                Storage::disk('public')->delete($book->cover_image);
            }
            $data['cover_image'] = $request->file('cover_image')->store('book-covers', 'public');
        }

        $requestedTotal = (int) $data['total_copies'];
        // total_copies is derived from the copy rows — syncToTotal below owns it.
        unset($data['total_copies'], $data['available_copies']);

        $book->update($data);

        // Add or retire physical copies to match. Copies that are on loan (or
        // flagged damaged/lost) are never destroyed, so the admin is told when
        // the requested count could not be reached.
        $result = $this->copies->syncToTotal($book, $requestedTotal);

        $message = 'Book updated successfully.';
        if ($result['created'] > 0) {
            $message .= " Added {$result['created']} new copy label(s) — print them from the Copies page.";
        }
        if ($result['blocked'] > 0) {
            $message .= " {$result['blocked']} copy/copies could not be removed because they are on loan or have borrowing history.";
        }

        return redirect()->route($user->isLibrarian() ? 'librarian.books.index' : 'admin.books.index')
            ->with('success', $message);
    }

    public function destroy(Book $book)
    {
        // Only librarians manage books (panel requirement). destroy() has no FormRequest.
        abort_unless(Auth::user()->isLibrarian(), 403, 'Only librarians can delete books.');

        $this->authorizeSchoolAccess($book);
        $user = Auth::user();

        if ($book->cover_image) {
            Storage::disk('public')->delete($book->cover_image);
        }

        $book->delete();

        return redirect()->route($user->isLibrarian() ? 'librarian.books.index' : 'admin.books.index')
            ->with('success', 'Book deleted successfully.');
    }

    private function authorizeSchoolAccess(Book $book): void
    {
        $user = Auth::user();

        // Everyone except the super admin is locked to their own school's books.
        if (!$user->isSuperAdmin() && $book->school_id !== $user->school_id) {
            abort(403, 'This book belongs to another school.');
        }
    }

    public function qrCode(Book $book)
    {
        $qrService = new QrCodeService();
        $imageData = $qrService->generateForBook($book->qr_code);
        $mimeType = $qrService->getMimeType();
        $extension = $mimeType === 'image/png' ? 'png' : 'svg';

        return response($imageData, 200, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => "attachment; filename=\"book-{$book->id}-qr.{$extension}\"",
        ]);
    }
}
