<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class GuestMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$guards): Response
    {
        $guards = empty($guards) ? [null] : $guards;

        foreach ($guards as $guard) {
            if (Auth::guard($guard)->check()) {
                // Get the authenticated user
                $user = Auth::guard($guard)->user();

                // Redirect to the dashboard matching the user's role
                return match ($user->user_role) {
                    'super_admin' => redirect()->route('superadmin.dashboard'),
                    'admin', 'school_admin' => redirect()->route('admin.dashboard'),
                    'librarian' => redirect()->route('librarian.dashboard'),
                    default => redirect()->route('student.dashboard'),
                };
            }
        }

        return $next($request);
    }
}
