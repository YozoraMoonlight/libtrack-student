import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { WaveTransition } from './WaveTransition';
import { TIMELINE, type ThemeTransitionRequest, type TransitionPhase } from './shared';

interface ThemeTransitionOverlayProps {
  request: ThemeTransitionRequest;
  onCovered: () => void;
  onDone: () => void;
}

export function ThemeTransitionOverlay({ request, onCovered, onDone }: ThemeTransitionOverlayProps) {
  const [phase, setPhase] = useState<TransitionPhase>('cover');
  const timing = TIMELINE.wave;

  // Timer-driven timeline so it always completes
  useEffect(() => {
    // Small buffer so the screen is fully covered before the theme swaps underneath
    const covered = window.setTimeout(() => {
      onCovered();
      setPhase('hold');
    }, timing.cover + 80);
    const reveal = window.setTimeout(() => setPhase('reveal'), timing.cover + timing.hold);
    const done = window.setTimeout(onDone, timing.cover + timing.hold + timing.reveal + 120);
    return () => {
      window.clearTimeout(covered);
      window.clearTimeout(reveal);
      window.clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id]);

  return createPortal(
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden"
      style={{ zIndex: 2147483000, pointerEvents: phase === 'reveal' ? 'none' : 'auto' }}>
      
      <WaveTransition request={request} phase={phase} />
    </div>,
    document.body
  );
}