import '../css/app.css';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { ToastProviderComponent } from './components/ui/toast';
// Removed initializeTheme since we want to force light mode
// import { initializeTheme } from './hooks/use-appearance';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Force light mode by ensuring the 'dark' class is not present
document.documentElement.classList.remove('dark');

// Radix UI menus/dialogs/selects lock <body> with `pointer-events: none` while
// open and clear it when they close. When an Inertia visit swaps the page while
// one is still mid-close — submitting a form right after picking from a <Select>,
// returning a book, or navigating from the account menu — the component unmounts
// before Radix's cleanup runs, so the lock sticks and the WHOLE next page becomes
// unclickable until a full browser refresh. That stale lock is what made every
// post-action screen seem to "need a refresh". Clear it after every visit, and
// again on the next tick to beat Radix re-applying it during its close animation.
//
// Background live refreshes (hooks/use-live-refresh.ts) are skipped: they
// re-render the SAME page, so nothing unmounts mid-close — and clearing the lock
// then would unlock the page behind a dialog or dropdown that is still open.
const clearPointerLock = () => {
    if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = '';
    }
};
let backgroundVisits = 0;
router.on('start', (event) => {
    if (event.detail.visit.async) backgroundVisits++;
});
router.on('navigate', () => {
    if (backgroundVisits === 0) clearPointerLock();
});
router.on('finish', (event) => {
    if (event.detail.visit.async) {
        backgroundVisits = Math.max(0, backgroundVisits - 1);
        return;
    }
    clearPointerLock();
    setTimeout(clearPointerLock, 0);
});

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name: string) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }: { el: HTMLElement; App: any; props: any }) {
        const root = createRoot(el);
        root.render(
            <ToastProviderComponent>
                <App {...props} />
            </ToastProviderComponent>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// Removed initializeTheme() call to prevent overriding our forced white mode
// initializeTheme();
