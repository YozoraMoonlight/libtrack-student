import React, { useEffect, useMemo } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { ThemeScene } from './ThemeScene';
import { EASE_IN_OUT, PALETTE, TIMELINE, type TransitionVariantProps } from './shared';

const SCENE_EXIT = 0.14;

/**
 * A wave of the new theme floods out from the tap point, then recedes back into it.
 * Both directions are hard-edged wipes — no cross-fading between mismatched colors.
 */
export function WaveTransition({ request, phase }: TransitionVariantProps) {
  const colors = PALETTE[request.to];
  const timing = TIMELINE.wave;
  const revealing = phase === 'reveal';
  const radius = useMemo(
    () =>
    Math.ceil(
      Math.hypot(Math.max(request.x, window.innerWidth - request.x), Math.max(request.y, window.innerHeight - request.y))
    ) + 4,
    [request.x, request.y]
  );

  const circle = useMotionValue(0);
  const clipPath = useTransform(circle, (r) =>
  r >= radius ? 'none' : `circle(${Math.max(0, r)}px at ${request.x}px ${request.y}px)`
  );

  useEffect(() => {
    const controls = revealing ?
    animate(circle, 0, {
      duration: timing.reveal / 1000 - SCENE_EXIT,
      delay: SCENE_EXIT,
      ease: EASE_IN_OUT
    }) :
    animate(circle, radius, { duration: timing.cover / 1000, ease: EASE_IN_OUT });
    return () => controls.stop();
  }, [circle, radius, revealing, timing.cover, timing.reveal]);

  return (
    <div className="absolute inset-0">
      <motion.div className="absolute inset-0" style={{ clipPath, WebkitClipPath: clipPath, backgroundColor: colors.bg }} />
      <ThemeScene request={request} phase={phase} delay={0.45} />
    </div>);

}