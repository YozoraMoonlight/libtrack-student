<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class InventoryController extends Controller
{
    public function export(Request $request)
    {
        $auth = Auth::user();
        $query = Book::with('category')
            ->when(!$auth->isSuperAdmin(), fn ($q) => $q->where('school_id', $auth->school_id));

        if ($request->search) {
            $query->search($request->search);
        }
        if ($request->status) {
            $query->filterByStatus($request->status);
        }
        if ($request->category_id) {
            $query->filterByCategory($request->category_id);
        }

        $books = $query->orderBy('title')->get();

        return response()->streamDownload(function () use ($books) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Title', 'Author', 'ISBN', 'Category', 'Total Copies', 'Available Copies', 'Location', 'Status']);
            foreach ($books as $book) {
                fputcsv($handle, [
                    $book->title,
                    $book->author,
                    $book->isbn ?? '',
                    $book->category?->name ?? '',
                    $book->total_copies,
                    $book->available_copies,
                    $book->location ?? '',
                    $book->status,
                ]);
            }
            fclose($handle);
        }, 'inventory-' . now()->format('Y-m-d') . '.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    public function index(Request $request)
    {
        $auth = Auth::user();
        // School admins and librarians see only their school's inventory; the
        // super admin sees every school.
        $schoolScope = fn ($q) => !$auth->isSuperAdmin()
            ? $q->where('school_id', $auth->school_id)
            : $q;

        $query = Book::with('category');
        $schoolScope($query);

        if ($request->search) {
            $query->search($request->search);
        }

        if ($request->status) {
            $query->filterByStatus($request->status);
        }

        if ($request->category_id) {
            $query->filterByCategory($request->category_id);
        }

        $books = $query->orderBy('title')->paginate(15)->withQueryString();

        $base = fn () => $schoolScope(Book::query());

        $statusCounts = [
            'total' => $base()->count(),
            'available' => $base()->where('status', 'available')->count(),
            'borrowed' => $base()->where('status', 'borrowed')->count(),
            'reserved' => $base()->where('status', 'reserved')->count(),
            'damaged' => $base()->where('status', 'damaged')->count(),
            'lost' => $base()->where('status', 'lost')->count(),
        ];

        return Inertia::render('Admin/Inventory/Index', [
            'user' => ['name' => $auth->name, 'email' => $auth->email],
            'books' => $books,
            'statusCounts' => $statusCounts,
            'categories' => Category::orderBy('name')->get(),
            'filters' => $request->only(['search', 'status', 'category_id']),
        ]);
    }
}
