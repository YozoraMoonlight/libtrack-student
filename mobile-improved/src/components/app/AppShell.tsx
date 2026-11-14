import React, { useCallback, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
import { useAuth } from '../../auth/AuthContext';

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const { logout } = useAuth();
  const [gameOpen, setGameOpen] = useState(false);
  const closeGame = useCallback(() => setGameOpen(false), []);
  const [bellOpen, setBellOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  // The owl pop-up announces arrivals on screen while the app is in use. It is
  // held back only while the bell panel is open, so it cannot appear behind the
  // panel and time out unseen.
  //
  // This is now the app's ONLY arrival notification: Android system
  // notifications are switched off (ANDROID_NOTIFICATIONS_ENABLED), so without
  // this a student who borrows a book gets no feedback at all until they happen
  // to open the app. It also costs nothing - no runtime permission, and no
  // heads-up behaviour for the phone vendor to clamp.
  const notifications = useNotifications(true, bellOpen);

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
              onMarkAllRead={notifications.markAllRead}
              onDismiss={notifications.dismiss}
              onDismissAll={notifications.dismissAll} />
            
            <AccountMenu hasNewUpdates={notifications.updatesUnseen} />
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

      <NotificationPopup
        notification={notifications.popup}
        remaining={Math.max(notifications.pendingCount - 1, 0)}
        onOpen={() => {
          notifications.openPopup();
          setBellOpen(true);
        }}
        onDismiss={notifications.dismissPopup}
      />

      {isMobile ? <BookCatchGame open={gameOpen} onClose={closeGame} /> : null}

      {notifications.accountDisabled ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-5">
          <div role="alertdialog" aria-modal="true" aria-labelledby="account-disabled-title" className="w-full max-w-[360px] rounded-2xl bg-white p-5 shadow-card">
            <h2 id="account-disabled-title" className="text-lg font-extrabold tracking-[-0.02em] text-ink">
              Account disabled
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              {notifications.accountDisabledMessage
                ?? "Your account has been disabled. Please contact your school's library administrator."}
            </p>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => {
                setSigningOut(true);
                void logout().finally(() => navigate('/login', { replace: true }));
              }}
              className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-ink text-sm font-bold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      ) : null}
    </div>);

}