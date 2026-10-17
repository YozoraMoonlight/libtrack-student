import { usePage } from '@inertiajs/react';

interface Flash {
    success?: string | null;
    error?: string | null;
    info?: string | null;
}

/**
 * The success / error message a redirect carries (`->with('success', …)`).
 *
 * Most pages draw their own banner. The ones that don't render this — without
 * it a borrow, a new category, a fine or a saved profile happened with no word
 * on screen, and a refused action failed silently. (The toast provider in
 * app.tsx sits outside the Inertia page, so it never sees these messages.)
 */
export default function FlashMessages({ className = '' }: { className?: string }) {
    const { flash } = usePage().props as { flash?: Flash };

    if (!flash?.success && !flash?.error && !flash?.info) return null;

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {flash.success && (
                <div role="status" className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
                    {flash.success}
                </div>
            )}
            {flash.error && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                    {flash.error}
                </div>
            )}
            {flash.info && (
                <div role="status" className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
                    {flash.info}
                </div>
            )}
        </div>
    );
}
