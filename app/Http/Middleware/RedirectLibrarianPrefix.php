<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RedirectLibrarianPrefix
{
    public function handle(Request $request, Closure $next)
    {
        // Only redirect GET requests for librarians on /admin/* to /librarian/*
        if (
            $request->isMethod('get') &&
            Auth::check() &&
            Auth::user()->user_role === 'librarian' &&
            str_starts_with($request->path(), 'admin/')
        ) {
            $newPath = preg_replace('/^admin\//', 'librarian/', $request->path());

            // This hop is an extra request between an action and the page it
            // redirects to (CategoryController and SettingsController send
            // everyone to admin.* routes). Without reflash() the one-request
            // flash — "Category created successfully.", validation errors — is
            // spent here and the librarian never sees it.
            if ($request->hasSession()) {
                $request->session()->reflash();
            }

            return redirect($newPath . ($request->getQueryString() ? '?' . $request->getQueryString() : ''));
        }

        return $next($request);
    }
}
