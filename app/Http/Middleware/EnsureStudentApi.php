<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStudentApi
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (! $user->is_active) {
            $user->currentAccessToken()?->delete();

            return response()->json(['message' => 'Your account has been disabled.'], 403);
        }

        if ($user->user_role !== 'user') {
            return response()->json(['message' => 'Only student accounts can use the mobile app.'], 403);
        }

        return $next($request);
    }
}
