import React, { useCallback, useEffect, useRef, useState } from 'react';

/** Fires `onFire` once a pointer has been held down for `ms`. Releasing early optionally calls `onTap`. */
export function useLongPress(ms: number, onFire: () => void, onTap?: () => void) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const fired = useRef(false);
  const fire = useRef(onFire);
  const tap = useRef(onTap);
  fire.current = onFire;
  tap.current = onTap;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const cancel = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    setHolding(false);
  }, []);

  const start = useCallback(() => {
    if (timer.current) return;
    fired.current = false;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      fired.current = true;
      setHolding(false);
      fire.current();
    }, ms);
  }, [ms]);

  const end = useCallback(() => {
    const wasPending = Boolean(timer.current);
    cancel();
    if (wasPending && !fired.current) tap.current?.();
  }, [cancel]);

  const handlers = {
    onPointerDown: start,
    onPointerUp: end,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (event: React.MouseEvent) => event.preventDefault()
  };

  return { holding, handlers, cancel };
}