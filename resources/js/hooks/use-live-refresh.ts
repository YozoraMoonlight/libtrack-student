import { router } from '@inertiajs/react';
import { useEffect } from 'react';

/**
 * Keeps a page's data live: its props are re-fetched in the background every
 * few seconds, so a borrow, return, fine or return request made on any other
 * screen shows up here without anyone pressing refresh.
 *
 * Only the page's own data comes back (a partial reload), with state and
 * scroll preserved — half-filled forms, open dialogs, the QR scanner and
 * search boxes are untouched.
 */

/** Must match App\Http\Middleware\ReadOnlySessionForLiveRefresh::HEADER. */
export const LIVE_REFRESH_HEADER = 'X-Libtrack-Live-Refresh';

const DEFAULT_INTERVAL_MS = 2000;

// Shared props from HandleInertiaRequests are never re-fetched in the
// background: flash would vanish seconds after it appeared, and `quote` is
// random on every request. (`errors` can't be excluded — inertia-laravel always
// sends it — which is fine: forms keep their messages in useForm's own state.)
const SHARED_PROPS = ['auth', 'flash', 'name', 'quote', 'ziggy'];

// If a user visit's finish event never arrives, stop waiting for it after this.
const USER_VISIT_TIMEOUT_MS = 30000;

/** Cancel functions of background refreshes currently on the wire. */
const inFlight = new Set<() => void>();
/** When the user's own click/submit started; null when none is running. */
let userVisitStartedAt: number | null = null;
let guardsInstalled = false;

const sentByLiveRefresh = (config: any): boolean => {
    const headers = config?.headers;
    if (!headers) return false;
    return Boolean(typeof headers.get === 'function' ? headers.get(LIVE_REFRESH_HEADER) : headers[LIVE_REFRESH_HEADER]);
};

function installGuards() {
    if (guardsInstalled) return;
    guardsInstalled = true;

    router.on('start', (event) => {
        if (event.detail.visit.async) return;
        userVisitStartedAt = Date.now();
        // Inertia applies a late background response if the page still matches,
        // so a refresh sent BEFORE this action would land after it and put the
        // old data back on screen (a returned book reappearing, say). Drop it.
        inFlight.forEach((cancel) => cancel());
        inFlight.clear();
    });

    router.on('finish', (event) => {
        if (!event.detail.visit.async) userVisitStartedAt = null;
    });

    // A failed background refresh (server hiccup, dropped Wi-Fi) must not pop
    // Inertia's error modal every few seconds — the next tick just tries again.
    router.on('invalid', (event) => {
        if (sentByLiveRefresh((event.detail.response as any)?.config)) event.preventDefault();
    });
    router.on('exception', (event) => {
        if (sentByLiveRefresh((event.detail.exception as any)?.config)) event.preventDefault();
    });
}

interface LiveRefreshOptions {
    /** How often to re-fetch, in ms. */
    interval?: number;
    /** Extra props that are expensive and never change while the page is open. */
    except?: string[];
}

export function useLiveRefresh({ interval = DEFAULT_INTERVAL_MS, except = [] }: LiveRefreshOptions = {}) {
    const exceptKey = except.join(',');

    useEffect(() => {
        installGuards();

        let busy = false;
        let cancelOwn: (() => void) | null = null;

        const settle = () => {
            busy = false;
            if (cancelOwn) {
                inFlight.delete(cancelOwn);
                cancelOwn = null;
            }
        };

        const refresh = () => {
            // Hidden tabs cost nothing; a slow connection never stacks requests.
            if (busy || document.hidden) return;
            if (userVisitStartedAt !== null && Date.now() - userVisitStartedAt < USER_VISIT_TIMEOUT_MS) return;

            busy = true;
            router.reload({
                except: [...SHARED_PROPS, ...(exceptKey ? exceptKey.split(',') : [])],
                headers: { [LIVE_REFRESH_HEADER]: '1' },
                replace: true,
                onCancelToken: ({ cancel }) => {
                    cancelOwn = cancel;
                    inFlight.add(cancel);
                },
                onCancel: settle,
                onFinish: settle,
            });
        };

        const timer = window.setInterval(refresh, interval);
        // Back on a tab that sat hidden: catch up now instead of a tick later.
        const onVisibilityChange = () => {
            if (!document.hidden) refresh();
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            cancelOwn?.();
            settle();
        };
    }, [interval, exceptKey]);
}
