<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CredentialHold;
use App\Services\CredentialHoldService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CredentialHoldController extends Controller
{
    public function __construct(protected CredentialHoldService $service) {}

    public function index(Request $request)
    {
        $currentUser = Auth::user();

        $holds = CredentialHold::with(['user:id,name,email,student_id,lrn,school_id', 'user.school:id,name,code', 'releasedBy:id,name'])
            ->when(!$currentUser->isSuperAdmin(), function ($q) use ($currentUser) {
                $q->whereHas('user', fn ($qq) => $qq->where('school_id', $currentUser->school_id));
            })
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when(!$request->status, fn ($q) => $q->where('status', 'active'))
            ->orderByDesc('created_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Admin/CredentialHolds/Index', [
            'holds' => $holds,
            'filters' => $request->only(['status']),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'reason' => 'required|string|max:255',
            'amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        $user = \App\Models\User::findOrFail($request->user_id);
        $currentUser = Auth::user();

        if (!$currentUser->isSuperAdmin() && $user->school_id !== $currentUser->school_id) {
            abort(403, 'This student belongs to another school.');
        }

        $this->service->placeHold($user, $request->reason, (float) ($request->amount ?? 0), $request->notes);

        return back()->with('success', "Hold placed on {$user->name}'s credentials.");
    }

    public function release(Request $request, CredentialHold $hold)
    {
        $currentUser = Auth::user();

        if (!$currentUser->isSuperAdmin() && $hold->user->school_id !== $currentUser->school_id) {
            abort(403, 'This hold belongs to another school.');
        }

        $this->service->release($hold, $currentUser, $request->input('notes'));

        return back()->with('success', 'Credential hold released.');
    }
}
