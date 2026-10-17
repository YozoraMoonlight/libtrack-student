import React, { useMemo } from 'react';

interface QrCodeProps {
  value: string;
  className?: string;
  label?: string;
}

const SIZE = 25;

export function QrCode({ value, className, label }: QrCodeProps) {
  const path = useMemo(() => buildMatrix(value).map(([x, y]) => `M${x} ${y}h1v1h-1z`).join(''), [value]);

  return (
    <svg
      viewBox={`-1 -1 ${SIZE + 2} ${SIZE + 2}`}
      className={className}
      shapeRendering="crispEdges"
      style={{ display: 'block' }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}>
      
      <rect x={-1} y={-1} width={SIZE + 2} height={SIZE + 2} fill="#fff" />
      <path d={path} fill="#121212" />
    </svg>);

}

function buildMatrix(value: string): Array<[number, number]> {
  const random = seededRandom(hash(value));
  const cells: Array<[number, number]> = [];
  const finders: Array<[number, number]> = [
  [0, 0],
  [SIZE - 7, 0],
  [0, SIZE - 7]];


  const inFinderZone = (x: number, y: number) =>
  finders.some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7);

  finders.forEach(([fx, fy]) => {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        const edge = x === 0 || y === 0 || x === 6 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        if (edge || core) cells.push([fx + x, fy + y]);
      }
    }
  });

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (inFinderZone(x, y)) continue;
      if (random() > 0.52) cells.push([x, y]);
    }
  }

  return cells;
}

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandom(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ t >>> 15, t | 1);
    r ^= r + Math.imul(r ^ r >>> 7, r | 61);
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}