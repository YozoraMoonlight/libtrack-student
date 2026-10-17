import { useCallback } from 'react';

export function useMobileNavigation() {
    return useCallback(() => {
        // On mobile, closing the menu after navigation is optional.
        // We keep this hook as a no-op placeholder so the call site remains safe.
    }, []);
}
