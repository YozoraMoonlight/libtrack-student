import React, { createContext, useContext } from 'react';

export type AppIconVariant = 'openBook' | 'shelf' | 'bookmark' | 'monogram';

const AppIconContext = createContext<AppIconVariant>('openBook');

export function AppIconProvider({ variant, children }: {variant: AppIconVariant;children: React.ReactNode;}) {
  return <AppIconContext.Provider value={variant}>{children}</AppIconContext.Provider>;
}

export function useAppIconVariant() {
  return useContext(AppIconContext);
}