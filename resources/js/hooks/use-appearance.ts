import { useCallback, useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'appearance';

function applyAppearance(value: Appearance) {
    const root = document.documentElement;

    if (value === 'dark') {
        root.classList.add('dark');
    } else if (value === 'light') {
        root.classList.remove('dark');
    } else {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', systemDark);
    }
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>('system');

    useEffect(() => {
        const stored = window.localStorage.getItem(STORAGE_KEY) as Appearance | null;
        const nextAppearance = stored === 'light' || stored === 'dark' ? stored : 'system';
        setAppearance(nextAppearance);
        applyAppearance(nextAppearance);
    }, []);

    useEffect(() => {
        if (appearance === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const listener = () => applyAppearance('system');
            mediaQuery.addEventListener('change', listener);
            return () => mediaQuery.removeEventListener('change', listener);
        }

        applyAppearance(appearance);
    }, [appearance]);

    const updateAppearance = useCallback((value: Appearance) => {
        setAppearance(value);
        window.localStorage.setItem(STORAGE_KEY, value);
        applyAppearance(value);
    }, []);

    return { appearance, updateAppearance };
}
