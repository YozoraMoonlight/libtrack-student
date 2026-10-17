<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class SuperAdminLoginController extends Controller
{
    public function index()
    {
        return Inertia::render('Auth/SuperAdminLogin');
    }

    public function store(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (!Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'auth' => 'Invalid super admin credentials.',
            ]);
        }

        $user = Auth::user();

        if ($user->user_role !== 'super_admin') {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'auth' => 'This portal is for the platform super admin only.',
            ]);
        }

        if (!$user->is_active) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'auth' => 'This super admin account has been disabled.',
            ]);
        }

        $request->session()->regenerate();
        $user->update(['last_login_at' => now()]);

        return redirect()->route('superadmin.dashboard');
    }
}
