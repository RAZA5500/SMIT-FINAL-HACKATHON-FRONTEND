/** A short burst of confetti for milestone moments (loaded lazily, respects reduced motion). */
export async function celebrate(colors: string[] = ['#10B981', '#0D9488', '#F59E0B', '#8B5CF6']): Promise<void> {
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  try {
    const { default: confetti } = await import('canvas-confetti');
    const burst = (originX: number, angle: number) =>
      confetti({ particleCount: 70, spread: 70, startVelocity: 42, angle, origin: { x: originX, y: 0.75 }, colors, scalar: 0.9, zIndex: 9999 });
    burst(0.15, 60);
    burst(0.85, 120);
  } catch {
    /* decoration only */
  }
}
