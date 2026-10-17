<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Fine;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class FineController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $fines = Fine::with('transaction.book')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        $totalUnpaid = (float) Fine::where('user_id', $user->id)
            ->whereIn('status', ['unpaid', 'partial'])
            ->selectRaw('COALESCE(SUM(amount - paid_amount), 0) AS remaining')
            ->value('remaining');

        return Inertia::render('User/Fines/Index', [
            'user' => ['name' => $user->name, 'email' => $user->email],
            'fines' => $fines,
            'totalUnpaid' => $totalUnpaid,
        ]);
    }
}
