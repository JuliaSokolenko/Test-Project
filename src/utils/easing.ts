/**
 * Easing functions for animations.
 */

/**
 * Cubic ease-in-out: slow start, fast middle, slow end.
 */
export function easeInOutCubic(t: number): number {
  if (t < 0.5) {
    const tCubed = t * t * t;
    return 4 * tCubed;
  }
  const oneMinusT = 1 - t;
  const oneMinusTCubed = oneMinusT * oneMinusT * oneMinusT;
  return 1 - 4 * oneMinusTCubed;
}
