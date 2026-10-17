import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellIcon, BellOffIcon, CheckCheckIcon, Trash2Icon, XIcon } from 'lucide-react';
import { NotificationIcon } from './NotificationIcon';
import type { AppNotification } from '../../../types/notifications';
import { cn } from '../../../utils/cn';

interface NotificationBellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: AppNotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  /** Remove one notification from the list on this device. */
  onDismiss?: (id: string) => void;
  /** Empty the list on this device. */
  onDismissAll?: () => void;
}

const ease = [0.23, 1, 0.32, 1] as const;

export function NotificationBell({ open, onOpenChange, items, unreadCount, onMarkRead, onMarkAllRead, onDismiss, onDismissAll }: NotificationBellProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) onOpenChange(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        onClick={() => onOpenChange(!open)}
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-full text-ink/60 transition-[background-color,transform] duration-150 ease-out active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber',
          open ? 'bg-ink/[0.06] text-ink' : 'hover:bg-ink/5 hover:text-ink'
        )}>
        
        <BellIcon className="h-5 w-5" aria-hidden="true" />
        {unreadCount ?
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-[#fff] ring-2 ring-[rgb(var(--color-paper))]">
          
            {unreadCount}
          </span> :
        null}
      </button>

      <AnimatePresence>
        {open ?
        // Centred under the header so the panel never runs off a narrow phone screen
        <div className="pointer-events-none fixed inset-x-0 top-[calc(max(0.875rem,env(safe-area-inset-top))+52px)] z-50 flex justify-center px-3">
            <motion.section
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease }}
            style={{ willChange: 'transform, opacity', backfaceVisibility: 'hidden' }}
            className="pointer-events-auto w-full transform-gpu max-w-[406px] overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/[0.08]">
            
              <header className="flex items-center justify-between border-b border-ink/[0.07] px-4 py-3">
                <div>
                  <h2 className="text-[15px] font-bold text-ink">Notifications</h2>
                  <p className="text-xs text-ink/50" aria-live="polite">
                    {unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {items.length && onDismissAll ? (
                    <button
                    type="button"
                    onClick={onDismissAll}
                    disabled={!items.length}
                    className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-ink/50 transition-colors duration-150 hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber disabled:text-ink/30">
                      <Trash2Icon className="h-4 w-4" aria-hidden="true" />
                      Clear all
                    </button>
                  ) : null}
                  <button
                  type="button"
                  onClick={onMarkAllRead}
                  disabled={!unreadCount}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-brand-ember transition-colors duration-150 hover:bg-brand-amber/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber disabled:text-ink/30 disabled:hover:bg-[transparent]">
                  
                    <CheckCheckIcon className="h-4 w-4" aria-hidden="true" />
                    Mark all as read
                  </button>
                </div>
              </header>

              {items.length ?
            <ul className="max-h-[min(60dvh,440px)] divide-y divide-ink/[0.06] overflow-y-auto overscroll-contain">
                  {items.map((item) =>
              <li key={item.id} className="relative">
                      <button
                  type="button"
                  onClick={() => onMarkRead(item.id)}
                  className={cn(
                    'flex w-full gap-3 px-4 py-3 pr-11 text-left transition-colors duration-150 focus-visible:bg-ink/[0.04] focus-visible:outline-none',
                    item.unread ? 'bg-brand-amber/[0.07]' : 'active:bg-ink/[0.03]'
                  )}>
                  
                        <NotificationIcon kind={item.kind} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className={cn('text-[14px] text-ink', item.unread ? 'font-bold' : 'font-semibold')}>{item.title}</span>
                            {item.unread ?
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-amber">
                                <span className="sr-only">Unread</span>
                              </span> :
                      null}
                          </span>
                          <span className="mt-0.5 block text-[13px] leading-5 text-ink/65">{item.body}</span>
                          <span className="mt-1 block text-xs text-ink/40">
                            {item.time} · by {item.actor}
                          </span>
                        </span>
                      </button>
                      {onDismiss ? (
                        <button
                        type="button"
                        onClick={() => onDismiss(item.id)}
                        aria-label={`Remove notification: ${item.title}`}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-ink/35 transition-colors duration-150 hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
                          <XIcon className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </li>
              )}
                </ul> :

            <div className="flex flex-col items-center px-6 py-10 text-center">
                  <BellOffIcon className="h-6 w-6 text-ink/30" aria-hidden="true" />
                  <p className="mt-2 text-sm font-semibold text-ink">No notifications yet</p>
                  <p className="mt-0.5 text-[13px] text-ink/50">Changes to your account and borrowings will show up here.</p>
                </div>
            }
            </motion.section>
          </div> :
        null}
      </AnimatePresence>
    </div>);

}