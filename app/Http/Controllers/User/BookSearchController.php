<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\Category;
use App\Services\QrCodeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class BookSearchController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();

        $books = Book::with('category')
            ->when($user->school_id, fn ($q) => $q->where('school_id', $user->school_id))
            ->when(!$user->school_id, fn ($q) => $q->whereRaw('1 = 0'))
            ->search($request->search)
            ->filterByCategory($request->category_id)
            ->filterByStatus($request->status)
            ->orderBy('title')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('User/Books/Index', [
            'user' => ['name' => $user->name, 'email' => $user->email],
            'books' => $books,
            'categories' => Category::orderBy('name')->get(),
            'filters' => $request->only(['search', 'category_id', 'status']),
        ]);
    }

    public function show(Book $book)
    {
        $user = Auth::user();

        if ($user->school_id && $book->school_id !== $user->school_id) {
            abort(404);
        }

        $book->load('category');

        $hasActiveBorrow = $book->transactions()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->exists();

        return Inertia::render('User/Books/Show', [
            'user' => ['name' => $user->name, 'email' => $user->email],
            'book' => $book,
            'hasActiveBorrow' => $hasActiveBorrow,
        ]);
    }

    public function qrCode(Book $book)
    {
        $user = Auth::user();
        if ($user->school_id && $book->school_id !== $user->school_id) {
            abort(404);
        }

        $qrService = new QrCodeService();
        $imageData = $qrService->generateForBook($book->qr_code);
        $mimeType = $qrService->getMimeType();

        return response($imageData, 200, [
            'Content-Type' => $mimeType,
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}
