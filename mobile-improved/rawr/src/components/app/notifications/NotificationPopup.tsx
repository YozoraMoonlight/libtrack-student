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
}

const ease = [0.23, 1, 0.32, 1] as const;

/** The newest notice, delivered by the LIBTRACK owl perched on top of the card. */
export function NotificationPopup({ notification, onDismiss, onOpen }: NotificationPopupProps) {
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
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0, transition: { duration: 0.15 } } : { opacity: 0, y: -16, transition: { duration: 0.18, ease } }}
          transition={{ duration: 0.24, ease }}
          drag={reduceMotion ? false : 'y'}
          dragSnapToOrigin
          dragElastic={{ top: 0.5, bottom: 0 }}
          dragConstraints={{ top: 0, bottom: 0 }}
          onDragEnd={(_, info) => {
            if (info.offset.y < -30 || info.velocity.y < -300) onDismiss();
          }}
          style={{ willChange: 'transform, opacity', backfaceVisibility: 'hidden', touchAction: 'none' }}
          className="pointer-events-auto relative w-full max-w-[406px] transform-gpu">
          
            {/* The owl perches on the card's top edge, feet gripping it */}
            <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -top-[52px] right-5 z-10 w-[72px]"
            initial={reduceMotion ? false : { y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 26, delay: 0.08 }}>
            
              <OwlMascot mood="watching" lookProgress={0.1} className="block h-auto w-full" />
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
                  <span className="block text-[14px] font-bold text-ink">{notification.title}</span>
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

}