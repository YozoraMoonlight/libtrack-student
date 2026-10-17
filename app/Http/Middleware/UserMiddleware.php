<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class UserMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if user is authenticated
        if (!Auth::check()) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthorized access',
                ], 401);
            }

            return redirect()->route('auth.login')->with('error', 'Please login to access this page');
        }

        $authUser = Auth::user();

        // Block disabled accounts
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

        // Student portal is restricted to the 'user' role; staff have their own dashboards.
        if ($authUser->user_role !== 'user') {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'Access denied. User privileges required',
                ], 403);
            }

            return redirect()->route('home')->with('error', 'Access denied. User privileges required');
        }

        // User is authenticated and has user role, proceed
        return $next($request);
    }
}
