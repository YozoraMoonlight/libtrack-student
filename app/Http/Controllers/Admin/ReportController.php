<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\Category;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $auth = Auth::user();
        // School-scoped users (school admins + librarians) only see their own
        // school's reports; the super admin sees every school.
        $scoped = !$auth->isSuperAdmin();
        $schoolId = $auth->school_id;

        $transactionScope = fn ($q) => $scoped
            ? $q->whereHas('book', fn ($b) => $b->where('school_id', $schoolId))
            : $q;

        $bookScope = fn ($q) => $scoped
            ? $q->where('school_id', $schoolId)
            : $q;

        $tab = $request->get('tab', 'borrowing');

        $data = [
            'user' => ['name' => $auth->name, 'email' => $auth->email],
            'tab' => $tab,
        ];

        if ($tab === 'borrowing') {
            $query = Transaction::with(['user', 'book']);
            $transactionScope($query);

            if ($request->status) {
                $query->where('status', $request->status);
            }

            $data['transactions'] = $query->orderBy('created_at', 'desc')->paginate(15)->withQueryString();
        } elseif ($tab === 'overdue') {
            $data['overdueTransactions'] = $transactionScope(Transaction::with(['user', 'book']))
                ->where(function ($q) {
                    $q->where('status', 'overdue')
                      ->orWhere(function ($q2) {
                          $q2->where('status', 'active')->where('due_date', '<', now());
                      });
                })
                ->orderBy('due_date', 'asc')
                ->paginate(15)
                ->withQueryString();
        } elseif ($tab === 'inventory') {
            $base = fn () => $bookScope(Book::query());

            $data['statusCounts'] = [
                'available' => $base()->where('status', 'available')->count(),
                'borrowed' => $base()->where('status', 'borrowed')->count(),
                'reserved' => $base()->where('status', 'reserved')->count(),
                'damaged' => $base()->where('status', 'damaged')->count(),
                'lost' => $base()->where('status', 'lost')->count(),
            ];
            $data['totalBooks'] = $base()->count();
            $data['totalCopies'] = (int) $base()->sum('total_copies');
            $data['availableCopies'] = (int) $base()->sum('available_copies');
            $data['categoryBreakdown'] = Category::withCount(['books' => $bookScope])
                ->withSum(['books as total_copies_sum' => $bookScope], 'total_copies')
                ->withSum(['books as available_copies_sum' => $bookScope], 'available_copies')
                ->orderBy('name')
                ->get();
        }

        $data['filters'] = $request->only(['status', 'tab']);

        return Inertia::render('Admin/Reports/Index', $data);
    }

    public function export(Request $request)
    {
        $auth = Auth::user();
        $transactionScope = fn ($q) => !$auth->isSuperAdmin()
            ? $q->whereHas('book', fn ($b) => $b->where('school_id', $auth->school_id))
            : $q;

        $type = $request->get('type', 'borrowing');

        if ($type === 'borrowing') {
            $query = Transaction::with(['user', 'book']);
            $transactionScope($query);
            if ($request->status) {
                $query->where('status', $request->status);
            }
            $transactions = $query->orderBy('created_at', 'desc')->get();

            return response()->streamDownload(function () use ($transactions) {
                $handle = fopen('php://output', 'w');
                fputcsv($handle, ['Book', 'Student', 'Borrowed', 'Due Date', 'Returned', 'Status']);
                foreach ($transactions as $t) {
                    fputcsv($handle, [
                        $t->book?->title ?? 'N/A',
                        $t->user?->name ?? 'N/A',
                        $t->borrowed_at->format('Y-m-d'),
                        $t->due_date->format('Y-m-d'),
                        $t->returned_at?->format('Y-m-d') ?? '',
                        $t->status,
                    ]);
                }
                fclose($handle);
            }, 'borrowing-history-' . now()->format('Y-m-d') . '.csv', [
                'Content-Type' => 'text/csv',
            ]);
        }

        $transactions = $transactionScope(Transaction::with(['user', 'book']))
            ->where(function ($q) {
                $q->where('status', 'overdue')
                  ->orWhere(function ($q2) {
                      $q2->where('status', 'active')->where('due_date', '<', now());
                  });
            })
            ->orderBy('due_date', 'asc')
            ->get();

        return response()->streamDownload(function () use ($transactions) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Book', 'Student', 'Borrowed', 'Due Date', 'Days Overdue', 'Status']);
            foreach ($transactions as $t) {
                fputcsv($handle, [
                    $t->book?->title ?? 'N/A',
                    $t->user?->name ?? 'N/A',
                    $t->borrowed_at->format('Y-m-d'),
                    $t->due_date->format('Y-m-d'),
                    (int) now()->diffInDays($t->due_date),
                    $t->status,
                ]);
            }
            fclose($handle);
        }, 'overdue-report-' . now()->format('Y-m-d') . '.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }
}
