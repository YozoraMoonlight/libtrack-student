import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../utils/cn';
import { sparklePath } from '../../utils/sparkle';

export type OwlMood = 'idle' | 'watching' | 'covering' | 'peeking' | 'shocked' | 'smug';

interface OwlMascotProps {
  mood: OwlMood;
  /** Secret-book easter egg: the owl wakes up, flaps and its eyes turn to stars */
  enchanted?: boolean;
  /** Code Geass easter egg: the right eye turns into a glowing Geass sigil */
  geass?: boolean;
  /** 0 → looking left (start of input), 1 → looking right (end of typed text) */
  lookProgress?: number;
  /**
   * Freeze the idle blink so the owl holds completely still once it has
   * settled. The notification popup needs this — a self-rescheduling blink
   * timer inside a fading overlay read as flicker on the device.
   */
  still?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Flat palettes: amber day owl, dusk-blue night owl with glowing amber eyes
const palettes = {
  light: {
    body: '#f6b93d',
    wing: '#e3a126',
    face: '#fff6e3',
    ink: '#1f1a17',
    beak: '#d9682b',
    sparks: ['#d9682b', '#e3a126']
  },
  dark: {
    body: '#474c6e',
    wing: '#363a57',
    face: '#f6b93d',
    ink: '#15131a',
    beak: '#ffe7b8',
    sparks: ['#f6b93d', '#ffe7b8']
  }
};

// Where sparkles twinkle around the owl (viewBox units, may sit outside the frame)
const sparkles = [
{ x: 4, y: 22, size: 5 },
{ x: 116, y: 18, size: 6 },
{ x: -4, y: 58, size: 4 },
{ x: 124, y: 60, size: 4.5 },
{ x: 60, y: 4, size: 5.5 },
{ x: 24, y: 2, size: 3.5 },
{ x: 98, y: 0, size: 3.5 }];


export function OwlMascot({ mood, enchanted = false, geass = false, lookProgress = 0.5, still = false, className, style }: OwlMascotProps) {
  const reduceMotion = useReducedMotion();
  const { theme } = useTheme();
  const colors = palettes[theme];
  const [blinking, setBlinking] = useState(false);
  const [flapUp, setFlapUp] = useState(false);

  useEffect(() => {
    if (reduceMotion || still) return;
    let openTimer: number | undefined;
    let closeTimer: number | undefined;
    const schedule = () => {
      closeTimer = window.setTimeout(() => {
        setBlinking(true);
        openTimer = window.setTimeout(() => {
          setBlinking(false);
          schedule();
        }, 120);
      }, 2600 + Math.random() * 2400);
    };
    schedule();
    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(closeTimer);
    };
  }, [reduceMotion, still]);

  // Flap the wings while enchanted
  useEffect(() => {
    if (!enchanted) {
      setFlapUp(false);
      return;
    }
    const interval = window.setInterval(() => setFlapUp((value) => !value), 150);
    return () => window.clearInterval(interval);
  }, [enchanted]);

  const progress = Math.min(1, Math.max(0, lookProgress));
  const watching = mood === 'watching' && !enchanted;
  const peeking = mood === 'peeking' && !enchanted;
  const covering = mood === 'covering' && !enchanted;
  const shocked = mood === 'shocked' && !enchanted;
  const smug = mood === 'smug' && !enchanted;

  const leftPupil = watching ? { x: -4 + progress * 8, y: 3 } : smug ? { x: 2, y: 3 } : { x: 0, y: 0 };
  const rightPupil = watching ? leftPupil : peeking ? { x: -3, y: 3.5 } : smug ? { x: 2, y: 3 } : { x: 0, y: 0 };
  const bodyY = mood === 'idle' ? 6 : covering ? 3 : shocked ? -6 : 0;

  // Wings stay tucked below the edge, swing up over the eyes, flap when enchanted, or fly up in shock
  const leftWing = enchanted ?
  { y: 0, rotate: flapUp ? -75 : -40 } :
  shocked ?
  { y: 0, rotate: -55 } :
  covering || peeking ?
  { y: 0, rotate: 0 } :
  { y: 44, rotate: 80 };
  const rightWing = enchanted ?
  { y: 0, rotate: flapUp ? 75 : 40 } :
  shocked ?
  { y: 0, rotate: 55 } :
  covering ?
  { y: 0, rotate: 0 } :
  peeking ?
  { y: 0, rotate: -38 } :
  { y: 44, rotate: -80 };

  // The mascot's motion is its core feedback, so it always animates (just calmer with reduced motion)
  const spring = reduceMotion ?
  { duration: 0.2, ease: 'easeOut' as const } :
  { type: 'spring' as const, stiffness: 420, damping: 32 };
  const eyeScale = !still && blinking && !covering && !enchanted && !shocked ? 0.1 : 1;

  const bodyAnimate = enchanted ?
  { y: [bodyY, -12, -12, -12, 0], rotate: [0, -6, 6, -4, 0] } :
  { y: bodyY, rotate: smug ? -6 : 0 };
  const bodyTransition = enchanted ? { duration: 1.9, times: [0, 0.14, 0.5, 0.84, 1], ease: 'easeInOut' as const } : spring;

  return (
    <svg
      viewBox="0 0 120 96"
      overflow="visible"
      aria-hidden="true"
      className={cn('[&_path]:transition-[fill] [&_circle]:transition-[fill] [&_rect]:transition-[fill] [&_path]:duration-200 [&_circle]:duration-200 [&_rect]:duration-200', className)}
      style={style}>
      
      <defs>
        <clipPath id="owl-mascot-clip">
          <rect x="-20" y="-40" width="160" height="130" />
        </clipPath>
      </defs>

      <g clipPath="url(#owl-mascot-clip)">
        <motion.g
          initial={false}
          animate={bodyAnimate}
          transition={bodyTransition}
          style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}>
          
          {/* Head: one flat shape with ear points (extends below the edge so rising never shows a gap) */}
          <path d="M16 116 V40 L24 18 L40 30 H80 L96 18 L104 40 V116 Z" fill={colors.body} />

          {/* Eyes */}
          {[
          { cx: 43, pupil: leftPupil },
          { cx: 77, pupil: rightPupil }].
          map(({ cx, pupil }) =>
          <g key={cx}>
              <circle cx={cx} cy="52" r={shocked ? 16 : 14} fill={colors.face} />
              {geass && cx === 77 ?
            // Geass: red iris with the bird sigil
            <g transform={`translate(${cx} 52)`}>
                  <motion.g
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: [0.4, 1.15, 1], opacity: 1 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
                
                    <circle r="10" fill="#d7263d" />
                    <path d="M-7 -3 Q0 3 7 -3 L4 1.5 Q0 4 -4 1.5 Z M0 2 L-2.4 7 H2.4 Z" fill="#ffd5da" />
                  </motion.g>
                </g> :
            shocked ?
            // ◉_◉ tiny pupils with a ring
            <g>
                  <circle cx={cx} cy="52" r="7" fill="none" stroke={colors.ink} strokeWidth="1.6" />
                  <circle cx={cx} cy="52" r="3" fill={colors.ink} />
                </g> :
            enchanted ?
            <g transform={`translate(${cx} 52)`}>
                  <motion.path
                d={sparklePath(9)}
                fill={colors.ink}
                initial={{ scale: 0.4, rotate: 0 }}
                animate={{ scale: 1, rotate: 180 }}
                transition={{ scale: { duration: 0.2, ease: 'easeOut' }, rotate: { duration: 1.8, ease: 'linear' } }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
              
                </g> :

            <motion.g
              initial={false}
              animate={{ scaleY: eyeScale }}
              transition={{ duration: 0.08, ease: 'easeOut' }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
              
                  <motion.circle cx={cx} cy="52" r="6" fill={colors.ink} initial={false} animate={pupil} transition={spring} />
                </motion.g>
            }
              {/* Smug: heavy half-closed lids */}
              {smug && !(geass && cx === 77) ? <path d={`M${cx - 15} 54 A15 15 0 0 1 ${cx + 15} 54 Z`} fill={colors.body} /> : null}
            </g>
          )}

          {/* Smug blush */}
          {smug ?
          <g fill="#ff8fa3" opacity="0.75">
              <ellipse cx="36" cy="71" rx="6" ry="2.6" />
              <ellipse cx="84" cy="71" rx="6" ry="2.6" />
            </g> :
          null}

          {/* Shocked sweat drop */}
          <AnimatePresence>
            {shocked ?
            <g transform="translate(103 32)">
                <motion.path
                d="M0 -8 C3 -3 5 0 5 3 A5 5 0 0 1 -5 3 C-5 0 -3 -3 0 -8 Z"
                fill="#7cc6ff"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 2 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }} />
              
              </g> :
            null}
          </AnimatePresence>

          {/* Beak */}
          <path d="M55 62 H65 L60 70 Z" fill={colors.beak} />

          {/* Wings */}
          <g style={wingStyle(leftWing, '22px 70px', enchanted)}>
            <path d="M22 70 C22 50 36 38 58 40 V70 Z" fill={colors.wing} />
          </g>
          <g style={wingStyle(rightWing, '98px 70px', enchanted)}>
            <path d="M98 70 C98 50 84 38 62 40 V70 Z" fill={colors.wing} />
          </g>
        </motion.g>
      </g>

      {/* Magic sparkles */}
      <AnimatePresence>
        {enchanted ?
        sparkles.map((spark, index) =>
        <g key={index} transform={`translate(${spark.x} ${spark.y})`}>
                <motion.path
            d={sparklePath(spark.size)}
            fill={colors.sparks[index % 2]}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1, 0.55, 1, 0], opacity: [0, 1, 1, 1, 0], rotate: [0, 90] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 1.6, delay: index * 0.05, ease: 'easeOut' }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
          
              </g>
        ) :
        null}
      </AnimatePresence>

      {/* Feet resting on the input edge */}
      <g fill={colors.beak}>
        <rect x="34" y="86" width="14" height="7" rx="3.5" />
        <rect x="72" y="86" width="14" height="7" rx="3.5" />
      </g>
    </svg>);

}

// Plain CSS transform + transition so the wing swing always plays, with a slight overshoot
function wingStyle(pose: {y: number;rotate: number;}, origin: string, fast: boolean): React.CSSProperties {
  return {
    transform: `translateY(${pose.y}px) rotate(${pose.rotate}deg)`,
    transformOrigin: origin,
    transition: fast ? 'transform 140ms ease-out' : 'transform 300ms cubic-bezier(0.34, 1.45, 0.64, 1)'
  };
}