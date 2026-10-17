<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\CredentialHold;
use App\Models\Fine;
use App\Models\LrnRegistry;
use App\Models\School;
use App\Models\Transaction;
use App\Models\User;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $stats = [
            'schools_count' => School::count(),
            'active_schools' => School::where('is_active', true)->count(),
            'students_count' => LrnRegistry::count(),
            'school_admins_count' => User::whereIn('user_role', ['admin', 'school_admin'])->count(),
            'librarians_count' => User::where('user_role', 'librarian')->count(),
            'books_count' => Book::sum('total_copies'),
            'active_borrows' => Transaction::where('status', 'active')->count(),
            'overdue_count' => Transaction::where('status', 'overdue')->count(),
            'unpaid_fines_total' => Fine::where('status', 'unpaid')->sum('amount'),
            'active_holds' => CredentialHold::where('status', 'active')->count(),
        ];

        $perSchool = School::withCount([
            'lrnRegistryEntries as students_count',
            'users as librarians_count' => fn ($q) => $q->where('user_role', 'librarian'),
            'books as books_count',
        ])->orderBy('name')->get();

        return Inertia::render('SuperAdmin/Dashboard', [
            'stats' => $stats,
            'per_school' => $perSchool,
        ]);
    }
}
