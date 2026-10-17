<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\LoginIdentifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class MobileLoginController extends Controller
{
    public function index()
    {
        session(['mobile_app_login' => true]);

        return Inertia::render('Auth/MobileLogin');
    }

    public function store(Request $request)
    {
        session(['mobile_app_login' => true]);

        // Accepts an email address OR a 12-digit LRN — same rule as the web
        // student portal, so a batch-registered student can sign in on the
        // phone with the LRN printed on their DepEd form.
        $input = $request->validate([
            'email' => ['required', 'string', 'max:255'],
            'password' => ['required'],
        ], [
            'email.required' => 'Enter your email address or LRN.',
        ]);

        $credentials = LoginIdentifier::credentials($input['email'], $input['password']);

        if ($credentials === null || !Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'auth' => 'Invalid email/LRN or password.',
            ]);
        }

        $request->session()->regenerate();

        $user = Auth::user();

        if (!$user->is_active) {
            Auth::logout();

            throw ValidationException::withMessages([
                'auth' => 'Your account has been disabled.',
            ]);
        }

        if ($user->user_role !== 'user') {
            Auth::logout();

            throw ValidationException::withMessages([
                'auth' => 'Only student accounts can use the mobile app.',
            ]);
        }

        return redirect('/dashboard');
    }
}