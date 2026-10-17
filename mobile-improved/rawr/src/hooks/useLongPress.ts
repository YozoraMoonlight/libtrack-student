import React, { useCallback, useEffect, useRef, useState } from 'react';

/** Fires `onFire` once a pointer has been held down for `ms`. Releasing early cancels silently. */
export function useLongPress(ms: number, onFire: () => void) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const fire = useRef(onFire);
  fire.current = onFire;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const cancel = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    setHolding(false);
  }, []);

  const start = useCallback(() => {
    if (timer.current) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      setHolding(false);
      fire.current();
    }, ms);
  }, [ms]);

  const handlers = {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (event: React.MouseEvent) => event.preventDefault()
  };

  return { holding, handlers, cancel };
}