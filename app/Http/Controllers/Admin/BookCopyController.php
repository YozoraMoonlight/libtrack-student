<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\BookCopy;
use App\Services\BookCopyService;
use App\Services\QrCodeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

/**
 * Per-copy QR labels and copy condition.
 *
 * This is where a librarian gets the codes that make copies distinguishable on
 * the shelf — without printing these, two copies of the same title are still
 * physically interchangeable no matter what the database says.
 */
class BookCopyController extends Controller
{
    public function __construct(protected BookCopyService $copies)
    {
    }

    public function index(Book $book, QrCodeService $qr)
    {
        $this->authorizeSchoolAccess($book);

        $book->load(['category', 'copies' => fn ($q) => $q->orderBy('copy_number'), 'copies.activeTransaction.user:id,name']);

        return Inertia::render('Admin/Books/Copies', [
            'book' => [
                'id' => $book->id,
                'title' => $book->title,
                'author' => $book->author,
                'isbn' => $book->isbn,
                'location' => $book->location,
                'total_copies' => $book->total_copies,
                'available_copies' => $book->available_copies,
                'category' => $book->category?->name,
            ],
            'copies' => $book->copies->map(fn (BookCopy $copy) => [
                'id' => $copy->id,
                'copy_number' => $copy->copy_number,
                'accession_number' => $copy->accession_number,
                'qr_code' => $copy->qr_code,
                'status' => $copy->status,
                'condition' => $copy->condition,
                'borrower' => $copy->activeTransaction?->user?->name,
                'due_date' => $copy->activeTransaction?->due_date?->toDateString(),
                // Rendered inline so the print sheet needs no extra requests
                // (and so it still prints if the server is unreachable mid-job).
                'qr_image' => $qr->generateBase64($qr->copyPayload($copy->qr_code)),
            ]),
            'manualStatuses' => BookCopy::MANUAL_STATUSES,
            'canManage' => Auth::user()->isLibrarian(),
        ]);
    }

    public function store(Book $book)
    {
        abort_unless(Auth::user()->isLibrarian(), 403, 'Only librarians can add copies.');
        $this->authorizeSchoolAccess($book);

        $copy = $this->copies->addCopy($book);

        return back()->with('success', "Copy {$copy->label()} added. Print its label before shelving it.");
    }

    public function update(Request $request, Book $book, BookCopy $copy)
    {
        abort_unless(Auth::user()->isLibrarian(), 403, 'Only librarians can update copies.');
        $this->authorizeSchoolAccess($book);
        abort_unless($copy->book_id === $book->id, 404);

        $request->validate([
            'status' => ['required', 'in:' . implode(',', BookCopy::MANUAL_STATUSES)],
            'condition' => ['nullable', 'string', 'max:100'],
        ]);

        // A copy that is physically with a student can't be re-shelved or
        // written off from here — close the loan first.
        if ($copy->status === 'borrowed') {
            return back()->with('error', "Copy {$copy->label()} is currently on loan. Process its return before changing its condition.");
        }

        $copy->update([
            'status' => $request->status,
            'condition' => $request->condition,
        ]);

        $this->copies->refreshCounts($book);

        return back()->with('success', "Copy {$copy->label()} updated.");
    }

    public function destroy(Book $book, BookCopy $copy)
    {
        abort_unless(Auth::user()->isLibrarian(), 403, 'Only librarians can remove copies.');
        $this->authorizeSchoolAccess($book);
        abort_unless($copy->book_id === $book->id, 404);

        if ($copy->status === 'borrowed') {
            return back()->with('error', "Copy {$copy->label()} is on loan and cannot be removed.");
        }

        if ($copy->transactions()->exists()) {
            return back()->with('error', "Copy {$copy->label()} has borrowing history and cannot be deleted. Mark it lost or damaged instead.");
        }

        if ($book->copies()->count() <= 1) {
            return back()->with('error', 'A book must keep at least one copy. Delete the book instead.');
        }

        $label = $copy->label();
        $copy->delete();
        $this->copies->refreshCounts($book);

        return back()->with('success', "Copy {$label} removed.");
    }

    public function qrCode(Book $book, BookCopy $copy, QrCodeService $qr)
    {
        $this->authorizeSchoolAccess($book);
        abort_unless($copy->book_id === $book->id, 404);

        $imageData = $qr->generateForCopy($copy->qr_code);
        $mimeType = $qr->getMimeType();
        $extension = $mimeType === 'image/png' ? 'png' : 'svg';

        return response($imageData, 200, [
            'Content-Type' => $mimeType,
            'Content-Disposition' => "attachment; filename=\"{$copy->accession_number}-qr.{$extension}\"",
        ]);
    }

    private function authorizeSchoolAccess(Book $book): void
    {
        $user = Auth::user();

        if (!$user->isSuperAdmin() && $book->school_id !== $user->school_id) {
            abort(403, 'This book belongs to another school.');
        }
    }
}
