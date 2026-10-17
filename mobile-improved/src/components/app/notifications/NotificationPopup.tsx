import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { XIcon } from 'lucide-react';
import { NotificationIcon } from './NotificationIcon';
import { OwlMascot } from '../../auth/OwlMascot';
import type { AppNotification } from '../../../types/notifications';

interface NotificationPopupProps {
  notification: AppNotification | null;
  onDismiss: () => void;
  /** Tapping the card opens the bell panel */
  onOpen: () => void;
  /** Extra waiting notices, shown as a "+N more" badge */
  remaining?: number;
}

const ease = [0.23, 1, 0.32, 1] as const;

/**
 * The newest notice, delivered by the LIBTRACK owl perched on top of the card.
 *
 * Memoised because the app polls every 3s: without this the whole subtree — the
 * owl included — re-rendered on every tick, which read as a flicker even though
 * nothing had changed.
 */
export const NotificationPopup = React.memo(function NotificationPopup({
  notification,
  onDismiss,
  onOpen,
  remaining = 0,
}: NotificationPopupProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(max(0.75rem,env(safe-area-inset-top))+52px)] z-[60] flex justify-center px-3"
      aria-live="polite">
      
      <AnimatePresence initial={false}>
        {notification ?
        <motion.div
          key={notification.id}
          role="status"
          // Position only. Fading a container that holds a separately composited,
          // spring-animated SVG made Android's WebView composite the two layers
          // out of step, which showed up as the owl ghosting behind the card.
          initial={reduceMotion ? false : { y: -16 }}
          animate={{ y: 0 }}
          exit={reduceMotion ? { transition: { duration: 0.12 } } : { y: -16, transition: { duration: 0.18, ease } }}
          transition={{ duration: 0.24, ease }}
          drag={reduceMotion ? false : 'y'}
          dragSnapToOrigin
          dragElastic={{ top: 0.5, bottom: 0 }}
          dragConstraints={{ top: 0, bottom: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.y < -30 || info.velocity.y < -300) onDismiss();
          }}
          className="pointer-events-auto relative w-full max-w-[406px]">

            {/* The owl perches on the card's top edge, feet gripping it */}
            <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -top-[52px] right-5 z-10 w-[72px]"
            initial={reduceMotion ? false : { y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 26, delay: 0.08 }}>

              <OwlMascot mood="watching" lookProgress={0.1} still className="block h-auto w-full" />
            </motion.div>

            <div className="flex items-start gap-3 rounded-2xl bg-white p-3 pr-2 shadow-card ring-1 ring-ink/[0.08]">
              <button
              type="button"
              onClick={() => {
                onDismiss();
                onOpen();
              }}
              className="flex min-w-0 flex-1 items-start gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
              
                <NotificationIcon kind={notification.kind} />
                <span className="min-w-0 flex-1 pt-0.5">
                  <span className="flex items-center gap-2">
                    <span className="block text-[14px] font-bold text-ink">{notification.title}</span>
                    {remaining > 0 ? (
                      <span className="shrink-0 rounded-md bg-brand-amber/20 px-1.5 py-0.5 text-[10px] font-bold text-brand-ember ring-1 ring-brand-amberDark/25">
                        +{remaining} more
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-ink/65">{notification.body}</span>
                </span>
              </button>
              <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss notification"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink/40 transition-colors duration-150 hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
              
                <XIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </motion.div> :
        null}
      </AnimatePresence>
    </div>);

});