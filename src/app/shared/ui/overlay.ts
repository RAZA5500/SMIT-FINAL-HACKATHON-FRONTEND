/** Counts open overlays so the page scroll stays locked while any dialog is open. */
let openOverlays = 0;

export function lockScroll(): void {
  openOverlays += 1;
  document.documentElement.style.overflow = 'hidden';
}

export function unlockScroll(): void {
  openOverlays = Math.max(0, openOverlays - 1);
  if (openOverlays === 0) document.documentElement.style.overflow = '';
}

/** Topmost overlay wins the Escape key. */
const stack: symbol[] = [];

export function pushOverlay(): symbol {
  const token = Symbol('overlay');
  stack.push(token);
  return token;
}

export function popOverlay(token: symbol): void {
  const index = stack.lastIndexOf(token);
  if (index >= 0) stack.splice(index, 1);
}

export function isTopOverlay(token: symbol | null): boolean {
  return !!token && stack[stack.length - 1] === token;
}
