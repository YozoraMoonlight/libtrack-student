/** SVG path for a curved four-point sparkle centered on 0,0 */
export function sparklePath(size: number) {
  const s = size;
  return `M0 ${-s} Q0 0 ${s} 0 Q0 0 0 ${s} Q0 0 ${-s} 0 Q0 0 0 ${-s} Z`;
}