<?php
namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\LoginIdentifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class LoginController extends Controller
{
    public function index(Request $request)
{
    $isMobileApp = $request->query('mobile') == '1';

    if ($isMobileApp) {
        session(['mobile_app_login' => true]);
    }
    return Inertia::render('Auth/Login', [
        'isMobileApp' => $isMobileApp,
    ]);
}
    public function store(Request $request)
    {
        // The field is still named `email` (that's what every client posts),
        // but it accepts an email address OR a 12-digit LRN. Batch-registered
        // students have a generated placeholder email they'd never type.
        $input = $request->validate([
            'email' => ['required', 'string', 'max:255'],
            'password' => ['required'],
        ], [
            'email.required' => 'Enter your email address or LRN.',
        ]);

        $credentials = LoginIdentifier::credentials($input['email'], $input['password']);

        // A null resolution means the LRN matched no account. Report it exactly
        // like a bad password so the form can't be used to probe for LRNs.
        if ($credentials === null || !Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'auth' => 'The provided credentials do not match our records.',
            ]);
        }

        $user = Auth::user();

        if (!in_array($user->user_role, ['user', 'librarian'], true)) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'auth' => 'Only students and librarians can sign in here.',
            ]);
        }

        if (!$user->is_active) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'auth' => 'Your account has been disabled. Please contact the library administrator.',
            ]);
        }

        if (session('mobile_app_login') === true && $user->user_role !== 'user') {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'auth' => 'Only student accounts can sign in through the mobile app.',
            ]);
        }

        $request->session()->regenerate();

        $user->update([
            'last_login_at' => now(),
        ]);

        if ($user->user_role === 'librarian') {
            return redirect()->route('librarian.dashboard');
        }

        return redirect()->route('user.dashboard');
    }

    public function destroy(Request $request)
    {
        $wasMobileApp = session('mobile_app_login') === true;

    Auth::logout();

    $request->session()->invalidate();
    $request->session()->regenerateToken();

    if ($wasMobileApp) {
        return redirect()->route('mobile.login');
    }

    return redirect()->route('home');
    }
}