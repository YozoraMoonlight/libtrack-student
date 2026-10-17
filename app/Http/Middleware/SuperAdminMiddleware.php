<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SuperAdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!Auth::check()) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Unauthorized access'], 401);
            }
            return redirect()->route('admin.auth.login')
                ->with('error', 'Please login to access this page');
        }

        $authUser = Auth::user();

        if (!$authUser->is_active) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            return redirect()->route('admin.auth.login')
                ->with('error', 'This account has been disabled.');
        }

        if (!$authUser->isSuperAdmin()) {
            if ($request->wantsJson() || $request->is('api/*')) {
                return response()->json(['message' => 'Access denied. Super Admin privileges required'], 403);
            }
            return redirect()->route('home')->with('error', 'Access denied. Super Admin privileges required');
        }

        return $next($request);
    }
}
