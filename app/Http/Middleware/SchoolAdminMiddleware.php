<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class SchoolAdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!Auth::check()) {
            return redirect()->route('admin.auth.login')->with('error', 'Please login.');
        }

        $authUser = Auth::user();

        if (!$authUser->is_active) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            return redirect()->route('admin.auth.login')->with('error', 'This account has been disabled.');
        }

        if (!in_array($authUser->user_role, ['super_admin', 'admin', 'school_admin'])) {
            return redirect()->route('home')->with('error', 'Access denied. School Admin privileges required.');
        }

        return $next($request);
    }
}
