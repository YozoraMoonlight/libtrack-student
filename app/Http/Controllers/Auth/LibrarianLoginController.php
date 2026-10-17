<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LibrarianLoginController extends Controller
{
    public function index()
    {
        return Inertia::render('Auth/LibrarianLogin');
    }

    public function store(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (!Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'auth' => 'Invalid librarian credentials.',
            ]);
        }

        $user = Auth::user();

        if ($user->user_role !== 'librarian') {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'auth' => 'This portal is for librarians only.',
            ]);
        }

        if (!$user->is_active) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'auth' => 'This librarian account has been disabled.',
            ]);
        }

        $request->session()->regenerate();
        $user->update(['last_login_at' => now()]);

        return redirect()->route('librarian.dashboard');
    }
}
