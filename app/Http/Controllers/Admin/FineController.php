<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Fine;
use App\Models\User;
use App\Services\CredentialHoldService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class FineController extends Controller
{
    public function index(Request $request)
    {
        $auth = Auth::user();
        $isSchoolScoped = !$auth->isSuperAdmin();
        $schoolScope = fn ($q) => $isSchoolScoped
            ? $q->whereHas('user', fn ($u) => $u->where('school_id', $auth->school_id))
            : $q;

        $query = Fine::with(['user', 'transaction.book']);
        $schoolScope($query);

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->search) {
            // Portable case-insensitive match (Postgres-only `ilike` 500s on SQLite).
            $like = '%' . mb_strtolower($request->search) . '%';
            $query->whereHas('user', function ($q) use ($like) {
                $q->whereRaw('lower(name) like ?', [$like])
                  ->orWhereRaw('lower(email) like ?', [$like]);
            });
        }

        $fines = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();

        $totalUnpaid = $schoolScope(Fine::where('status', 'unpaid'))->sum('amount');

        $users = User::where('user_role', 'user')
            ->when($isSchoolScoped, fn ($q) => $q->where('school_id', $auth->school_id))
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        return Inertia::render('Admin/Fines/Index', [
            'user' => ['name' => $auth->name, 'email' => $auth->email],
            'fines' => $fines,
            'totalUnpaid' => $totalUnpaid,
            'filters' => $request->only(['search', 'status']),
            'users' => $users,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'type' => 'required|in:overdue,lost,damaged',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string|max:255',
        ]);

        $auth = Auth::user();
        $target = User::findOrFail($request->user_id);

        if (!$auth->isSuperAdmin() && $target->school_id !== $auth->school_id) {
            return back()->with('error', 'This student belongs to another school.');
        }

        Fine::create([
            'user_id' => $request->user_id,
            'transaction_id' => null,
            'type' => $request->type,
            'amount' => $request->amount,
            'paid_amount' => 0,
            'status' => 'unpaid',
            'description' => $request->description,
        ]);

        app(CredentialHoldService::class)->evaluate($target);

        return back()->with('success', 'Fine created successfully.');
    }

    public function update(Request $request, Fine $fine, CredentialHoldService $holds)
    {
        $request->validate([
            'action' => 'required|in:mark_paid,hold_credentials',
        ]);

        $auth = Auth::user();
        if (!$auth->isSuperAdmin() && $fine->user?->school_id !== $auth->school_id) {
            abort(403, 'This fine belongs to another school.');
        }

        if ($request->action === 'mark_paid') {
            $fine->update([
                'status' => 'paid',
                'paid_amount' => $fine->amount,
                'paid_at' => Carbon::now(),
            ]);

            if ($fine->user) {
                $holds->autoReleaseIfClear($fine->user);
            }

            return back()->with('success', 'Fine marked as paid.');
        }

        if ($request->action === 'hold_credentials') {
            if (!$fine->user) {
                return back()->with('error', 'No student associated with this fine.');
            }

            $reason = 'Unpaid fine: ' . ucfirst($fine->type) . ' (₱' . number_format((float) $fine->amount, 2) . ')';
            $holds->placeHold(
                $fine->user,
                $reason,
                (float) $fine->amount,
                'Hold placed from fine #' . $fine->id . ' by ' . $auth->name
            );

            return back()->with('success', "Credentials hold placed on {$fine->user->name}.");
        }

        return back();
    }
}
