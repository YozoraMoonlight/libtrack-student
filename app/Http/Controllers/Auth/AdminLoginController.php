<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class AdminLoginController extends Controller
{
    public function index()
    {
        return Inertia::render('Auth/AdminLogin');
    }

    public function store(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (!Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'auth' => 'Invalid admin credentials.',
            ]);
        }

        $user = Auth::user();

        if (!in_array($user->user_role, ['super_admin', 'admin', 'school_admin'])) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'auth' => 'This portal is for administrators only.',
            ]);
        }

        if (!$user->is_active) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'auth' => 'This admin account has been disabled.',
            ]);
        }

        $request->session()->regenerate();
        $user->update(['last_login_at' => now()]);

        return $user->user_role === 'super_admin'
            ? redirect()->route('superadmin.dashboard')
            : redirect()->route('admin.dashboard');
    }
}
