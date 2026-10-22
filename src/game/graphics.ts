/**
 * Light graphics for slow computers and phones (carried over from the chase
 * game): `?gfx=light` halves the people and traffic and turns off edge
 * smoothing. The game and the French are the same either way.
 */
export function lightGraphics(): boolean {
  const q = new URLSearchParams(window.location.search).get('gfx');
  if (q === 'light') return true;
  if (q === 'full') return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  return (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2;
}
