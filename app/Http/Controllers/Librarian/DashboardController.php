<?php

namespace App\Http\Controllers\Librarian;

use App\Http\Controllers\Controller;
use App\Models\LrnRegistry;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $schoolId = $user->school_id;

        $bookScope = fn ($q) => $q->whereHas('book', fn ($b) => $b->where('school_id', $schoolId));

        $todayStart = Carbon::today();
        $todayEnd = Carbon::today()->endOfDay();

        $stats = [
            'borrowsToday' => Transaction::query()
                ->where($bookScope)
                ->whereBetween('borrowed_at', [$todayStart, $todayEnd])
                ->count(),
            'returnsToday' => Transaction::query()
                ->where($bookScope)
                ->whereBetween('returned_at', [$todayStart, $todayEnd])
                ->count(),
            'activeBorrows' => Transaction::query()
                ->where($bookScope)
                ->where('status', 'active')
                ->count(),
            'overdueItems' => Transaction::query()
                ->where($bookScope)
                ->where(function ($q) {
                    $q->where('status', 'overdue')
                      ->orWhere(function ($q2) {
                          $q2->where('status', 'active')->where('due_date', '<', now());
                      });
                })
                ->count(),
            'studentsAtSchool' => LrnRegistry::where('school_id', $schoolId)->count(),
        ];

        $todaysActivity = Transaction::query()
            ->where($bookScope)
            ->with(['user', 'book'])
            ->where(function ($q) use ($todayStart, $todayEnd) {
                $q->whereBetween('borrowed_at', [$todayStart, $todayEnd])
                  ->orWhereBetween('returned_at', [$todayStart, $todayEnd]);
            })
            ->orderBy('updated_at', 'desc')
            ->take(8)
            ->get();

        $overdueItems = Transaction::query()
            ->where($bookScope)
            ->with(['user', 'book'])
            ->where(function ($q) {
                $q->where('status', 'overdue')
                  ->orWhere(function ($q2) {
                      $q2->where('status', 'active')->where('due_date', '<', now());
                  });
            })
            ->orderBy('due_date', 'asc')
            ->take(8)
            ->get();

        return Inertia::render('Librarian/Dashboard', [
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'school_name' => $user->school?->name,
                'user_role' => $user->user_role,
            ],
            'stats' => $stats,
            'todaysActivity' => $todaysActivity,
            'overdueItems' => $overdueItems,
        ]);
    }
}
