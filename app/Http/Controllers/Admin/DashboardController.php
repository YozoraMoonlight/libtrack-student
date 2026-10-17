<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\Fine;
use App\Models\LrnRegistry;
use App\Models\Transaction;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $schoolId = $user->school_id;
        // One consistent rule across the app: everyone but the super admin is
        // scoped to their own school.
        $scopeBySchool = !$user->isSuperAdmin();

        $bookQuery = fn () => Book::query()
            ->when($scopeBySchool, fn ($q) => $q->where('school_id', $schoolId));

        $studentQuery = fn () => LrnRegistry::query()
            ->when($scopeBySchool, fn ($q) => $q->where('school_id', $schoolId));

        $transactionQuery = fn () => Transaction::query()
            ->when($scopeBySchool, fn ($q) => $q->whereHas('book', fn ($b) => $b->where('school_id', $schoolId)));

        $fineQuery = fn () => Fine::query()
            ->when($scopeBySchool, fn ($q) => $q->whereHas('user', fn ($u) => $u->where('school_id', $schoolId)));

        $stats = [
            'totalBooks' => $bookQuery()->count(),
            'totalUsers' => $studentQuery()->count(),
            'activeBorrows' => $transactionQuery()->where('status', 'active')->count(),
            'overdueItems' => $transactionQuery()->where(function ($q) {
                $q->where('status', 'overdue')
                  ->orWhere(function ($q2) {
                      $q2->where('status', 'active')->where('due_date', '<', now());
                  });
            })->count(),
            'unpaidFines' => $fineQuery()->where('status', 'unpaid')->sum('amount'),
        ];

        $recentTransactions = $transactionQuery()->with(['user', 'book'])
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        $overdueItems = $transactionQuery()->with(['user', 'book'])
            ->where(function ($q) {
                $q->where('status', 'overdue')
                  ->orWhere(function ($q2) {
                      $q2->where('status', 'active')->where('due_date', '<', now());
                  });
            })
            ->orderBy('due_date', 'asc')
            ->take(5)
            ->get();

        return Inertia::render('Admin/Dashboard', [
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
            ],
            'stats' => $stats,
            'recentTransactions' => $recentTransactions,
            'overdueItems' => $overdueItems,
        ]);
    }
}
