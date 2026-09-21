// Keep scene and interface motion in sync, with an explicit per-game override.
const system = matchMedia('(prefers-reduced-motion: reduce)');
let preference: string | null = null;
try { preference = localStorage.getItem('diggy-motion'); } catch { /* Optional. */ }
export function reducedMotion() {
  return preference === 'reduced' || (preference !== 'full' && system.matches);
}
function sync() {
  document.documentElement.dataset.motion = reducedMotion() ? 'reduced' : 'full';
}
export function toggleMotion() {
  preference = reducedMotion() ? 'full' : 'reduced';
  try { localStorage.setItem('diggy-motion', preference); } catch { /* Optional. */ }
  sync();
}
system.addEventListener('change', sync);
sync();
