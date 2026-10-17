import React, { useEffect, useRef, useState } from 'react';

const THRESHOLD = 72;
const MAX_PULL = 120;
const HOLD_AT = 60;

/** Touch pull-to-refresh on the window scroll. Only engages when the page is scrolled to the top. */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  // Stop the browser's own overscroll bounce from fighting the gesture
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overscrollBehaviorY;
    root.style.overscrollBehaviorY = 'contain';
    return () => {
      root.style.overscrollBehaviorY = previous;
    };
  }, []);

  function update(value: number) {
    pullRef.current = value;
    setPull(value);
  }

  function begin(y: number) {
    if (refreshingRef.current || window.scrollY > 0) return;
    startY.current = y;
    setDragging(true);
  }

  function move(y: number) {
    if (startY.current === null) return;
    const delta = y - startY.current;
    update(delta <= 0 ? 0 : Math.min(MAX_PULL, delta * 0.5));
  }

  async function end() {
    if (startY.current === null) return;
    startY.current = null;
    setDragging(false);
    if (pullRef.current < THRESHOLD) {
      update(0);
      return;
    }
    refreshingRef.current = true;
    setRefreshing(true);
    update(HOLD_AT);
    navigator.vibrate?.(8);
    try {
      await onRefresh();
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
      update(0);
    }
  }

  const handlers = {
    onTouchStart: (event: React.TouchEvent) => begin(event.touches[0].clientY),
    onTouchMove: (event: React.TouchEvent) => move(event.touches[0].clientY),
    onTouchEnd: () => void end(),
    onTouchCancel: () => void end()
  };

  return { pull, dragging, refreshing, progress: Math.min(1, pull / THRESHOLD), handlers };
}