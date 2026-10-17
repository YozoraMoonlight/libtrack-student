<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Session\NullSessionHandler;
use Symfony\Component\HttpFoundation\Response;

/**
 * Background "live refresh" requests read the session but never write it back.
 *
 * Open pages re-fetch their data every few seconds
 * (resources/js/hooks/use-live-refresh.ts). Laravel saves the WHOLE session at
 * the end of every request, so a refresh that overlapped a borrow or return
 * would either write back the session it loaded before that action — wiping
 * the "Book returned successfully." flash — or age the flash out before the
 * redirected page could show it.
 *
 * A refresh is also not user activity: a page left open still lets an idle
 * session expire, exactly as it did before pages refreshed themselves.
 */
class ReadOnlySessionForLiveRefresh
{
    /** Must match LIVE_REFRESH_HEADER in use-live-refresh.ts. */
    public const HEADER = 'X-Libtrack-Live-Refresh';

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('GET') && $request->headers->has(self::HEADER) && $request->hasSession()) {
            $request->session()->setHandler(new NullSessionHandler());
        }

        return $next($request);
    }
}
