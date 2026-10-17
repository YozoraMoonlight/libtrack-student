import React from 'react';
import { motion, useTransform, type MotionValue } from 'framer-motion';
import type { NightShelfBook } from '../../types/library';

type NightShelfCardProps = {
  book: NightShelfBook;
  index: number;
  step: number;
  width: number;
  scrollX: MotionValue<number>;
  active: boolean;
  reduceMotion: boolean;
  onSelect: () => void;
};

export function NightShelfCard({ book, index, step, width, scrollX, active, reduceMotion, onSelect }: NightShelfCardProps) {
  // 0 when centered, ±1 when one slot away — tracks the finger continuously
  const offset = useTransform(scrollX, (v) => v / step - index);
  const scale = useTransform(offset, [-1, 0, 1], [0.84, 1, 0.84]);
  const rotateY = useTransform(offset, [-1, 0, 1], reduceMotion ? [0, 0, 0] : [-22, 0, 22]);
  const y = useTransform(offset, [-1, 0, 1], reduceMotion ? [0, 0, 0] : [18, 0, 18]);
  const opacity = useTransform(offset, [-1.5, 0, 1.5], [0.3, 1, 0.3]);
  const shine = useTransform(offset, [-1, 0, 1], ['-60%', '0%', '60%']);

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-label={active ? `${book.title}, selected` : `Show ${book.title}`}
      aria-current={active}
      className="relative aspect-[2/3] shrink-0 snap-center overflow-hidden rounded-2xl bg-[#1a1a20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-amber"
      style={{
        width,
        scale,
        rotateY,
        y,
        opacity,
        boxShadow: active ? `0 24px 50px -18px ${book.accent}99` : '0 0 0 0 transparent',
        transition: 'box-shadow 220ms cubic-bezier(0.23, 1, 0.32, 1)'
      }}>
      
      <img src={book.cover} alt={`${book.title} poster`} className="h-full w-full object-cover" draggable={false} />
      {!reduceMotion &&
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-[200%] bg-[#ffffff]/[0.07]"
        style={{ x: shine, clipPath: 'polygon(45% 0, 55% 0, 50% 100%, 40% 100%)' }} />

      }
    </motion.button>);

}