<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class StaffMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!Auth::check()) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Unauthorized access'], 401);
            }
            return redirect()->route('auth.login')->with('error', 'Please login to access this page');
        }

        $authUser = Auth::user();

        if (!$authUser->is_active) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Account disabled.'], 403);
            }
            return redirect()->route('auth.login')
                ->with('error', 'Your account has been disabled. Please contact the library administrator.');
        }

        if (!in_array($authUser->user_role, ['super_admin', 'admin', 'school_admin', 'librarian'])) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Access denied. Staff privileges required'], 403);
            }
            return redirect()->route('home')->with('error', 'Access denied. Staff privileges required');
        }

        return $next($request);
    }
}
