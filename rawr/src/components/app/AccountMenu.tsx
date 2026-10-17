import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDownIcon, LogOutIcon, MoonIcon, SettingsIcon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../auth/AuthContext';
import { cn } from '../../utils/cn';

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const name = user?.name || 'Student';
  const email = user?.email || '';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'ST';

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function go(path: string) {
    setOpen(false);
    navigate(path);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex h-10 items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 transition-[background-color,transform] duration-150 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber',
          open ? 'bg-ink/[0.06]' : 'hover:bg-ink/[0.04]'
        )}>
        
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-xs font-bold text-brand-ember ring-1 ring-brand-amber/50">
          {initials}
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className={cn('h-4 w-4 text-ink/50 transition-transform duration-200 ease-out', open && 'rotate-180')} />
        
      </button>

      <AnimatePresence>
        {open ?
        <motion.div
          role="menu"
          aria-label="Account"
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          style={{ transformOrigin: 'top right' }}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-60 overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/[0.08]">
          
            <div className="px-4 py-3.5">
              <p className="truncate text-[15px] font-bold text-ink">{name}</p>
              <p className="truncate text-[13px] text-ink/55">{email}</p>
            </div>
            <div className="border-t border-ink/[0.07] p-1.5">
              <button
              type="button"
              role="menuitem"
              onClick={() => go('/app/settings')}
              className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-ink/[0.04] focus-visible:bg-ink/[0.04] focus-visible:outline-none">
              
                <SettingsIcon className="h-[18px] w-[18px] text-ink/55" aria-hidden="true" />
                Settings
              </button>
              <button
              type="button"
              role="menuitemcheckbox"
              aria-checked={theme === 'dark'}
              onClick={toggleTheme}
              className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-ink transition-colors duration-150 hover:bg-ink/[0.04] focus-visible:bg-ink/[0.04] focus-visible:outline-none">
              
                <MoonIcon className="h-[18px] w-[18px] text-ink/55" aria-hidden="true" />
                <span className="flex-1 text-left">Dark mode</span>
                <span
                aria-hidden="true"
                className={cn(
                  'relative h-6 w-10 rounded-full transition-colors duration-150',
                  theme === 'dark' ? 'bg-brand-amber' : 'bg-ink/15'
                )}>
                
                  <span
                  className={cn(
                    'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[#fff] shadow-sm transition-transform duration-150 ease-out',
                    theme === 'dark' && 'translate-x-4'
                  )} />
                
                </span>
              </button>
            </div>
            <div className="border-t border-ink/[0.07] p-1.5">
              <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                void logout().then(() => navigate('/login'));
              }}
              className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none dark:text-red-400 dark:hover:bg-red-500/10 dark:focus-visible:bg-red-500/10">
              
                <LogOutIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                Log out
              </button>
            </div>
          </motion.div> :
        null}
      </AnimatePresence>
    </div>);

}