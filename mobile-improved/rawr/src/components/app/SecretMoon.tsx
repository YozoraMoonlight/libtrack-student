import React, { useEffect, useRef, useState } from 'react';
import { MoonIcon } from 'lucide-react';
import { sounds } from '../../utils/sound';

interface SecretMoonProps {
  onUnlock: () => void;
}

const TAPS_TO_WAKE = 3;
const TAP_WINDOW_MS = 1200;
const AWAKE_MS = 4000;
const HOLD_MS = 2500;
export const NIGHT_SHELF_KEY = 'night-shelf-unlocked';

/**
 * A barely-visible moon at the end of the catalog.
 * Tap it three times quickly to wake it, then hold it within a few seconds.
 * Any misstep puts it back to sleep with no feedback.
 */
export function SecretMoon({ onUnlock }: SecretMoonProps) {
  const [awake, setAwake] = useState(false);
  const [holding, setHolding] = useState(false);
  const taps = useRef<number[]>([]);
  const holdTimer = useRef<number | undefined>(undefined);
  const sleepTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(holdTimer.current);
      window.clearTimeout(sleepTimer.current);
    },
    []
  );

  function sleep() {
    window.clearTimeout(sleepTimer.current);
    sleepTimer.current = undefined;
    taps.current = [];
    setAwake(false);
  }

  function registerTap() {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < TAP_WINDOW_MS), now];
    if (taps.current.length >= TAPS_TO_WAKE) {
      taps.current = [];
      setAwake(true);
      navigator.vibrate?.(6);
      sleepTimer.current = window.setTimeout(sleep, AWAKE_MS);
    }
  }

  function press() {
    if (!awake) {
      registerTap();
      return;
    }
    if (holdTimer.current) return;
    window.clearTimeout(sleepTimer.current);
    setHolding(true);
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = undefined;
      setHolding(false);
      sleep();
      sessionStorage.setItem(NIGHT_SHELF_KEY, '1');
      sounds.reveal();
      navigator.vibrate?.([30, 40, 60]);
      onUnlock();
    }, HOLD_MS);
  }

  function release() {
    if (!holdTimer.current) return;
    // Letting go early sends the moon straight back to sleep
    window.clearTimeout(holdTimer.current);
    holdTimer.current = undefined;
    setHolding(false);
    sleep();
  }

  const tone = holding ? 'text-brand-amber' : awake ? 'text-ink/25' : 'text-ink/[0.08]';

  return (
    <div className="flex justify-center pb-2 pt-10">
      <button
        type="button"
        aria-label="Crescent moon"
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
            event.preventDefault();
            press();
          }
        }}
        onKeyUp={release}
        onBlur={release}
        className="flex h-11 w-11 touch-none select-none items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber">
        
        <MoonIcon
          aria-hidden="true"
          className={`h-3.5 w-3.5 fill-current ${tone}`}
          style={{
            transform: holding ? 'scale(1.8) rotate(-24deg)' : 'scale(1) rotate(0deg)',
            transition: holding ?
            `transform ${HOLD_MS}ms linear, color ${HOLD_MS}ms linear` :
            'transform 150ms ease-out, color 200ms ease-out'
          }} />
        
      </button>
    </div>);

}