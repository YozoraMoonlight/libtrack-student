import React, { useCallback, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { AccountMenu } from './AccountMenu';
import { AppIcon } from './AppIcon';
import { BottomNav } from './BottomNav';
import { ThemeToggle } from './ThemeToggle';
import { BookCatchGame } from './BookCatchGame';
import { NotificationBell } from './notifications/NotificationBell';
import { NotificationPopup } from './notifications/NotificationPopup';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useNotifications } from '../../hooks/useNotifications';

export function AppShell() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const [gameOpen, setGameOpen] = useState(false);
  const closeGame = useCallback(() => setGameOpen(false), []);
  const [bellOpen, setBellOpen] = useState(false);
  const notifications = useNotifications();
  const openBell = useCallback(() => setBellOpen(true), []);

  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-paper">
      <div className="relative flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-paper">
        <header className="sticky top-0 z-30 flex items-center justify-between bg-paper px-5 pb-3 pt-[max(0.875rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2">
            {isMobile ?
            <button
              type="button"
              onClick={() => setGameOpen(true)}
              aria-label="LIBTRACK"
              className="rounded-[11px] transition-transform duration-150 ease-out active:scale-[0.9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ember">
              
                <AppIcon size="sm" />
              </button> :

            <AppIcon size="sm" />
            }
            <div className="leading-none">
              <p className="text-[15px] font-extrabold tracking-[-0.04em] text-ink">LIBTRACK</p>
              <p className="mt-0.5 text-[10px] font-semibold tracking-[0.12em] text-brand-ember">STUDENT</p>
            </div>
          </div>
          <div className="-mr-1 flex items-center">
            <ThemeToggle />
            <NotificationBell
              open={bellOpen}
              onOpenChange={setBellOpen}
              items={notifications.items}
              unreadCount={notifications.unreadCount}
              onMarkRead={notifications.markRead}
              onMarkAllRead={notifications.markAllRead} />
            
            <AccountMenu />
          </div>
        </header>

        <motion.main
          key={location.pathname}
          className="flex-1 pb-28"
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
          
          <Outlet />
        </motion.main>

        <BottomNav />
      </div>
      <NotificationPopup notification={notifications.popup} onDismiss={notifications.dismissPopup} onOpen={openBell} />
      {isMobile ? <BookCatchGame open={gameOpen} onClose={closeGame} /> : null}
    </div>);

}