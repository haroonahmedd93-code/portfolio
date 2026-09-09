// Decides whether the full WebGL hero should run at all.
// Anything uncertain resolves to "no" — degrade gracefully rather than risk a crash or jank.
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return false;
    // Some headless/software contexts report a context but fail on basic calls.
    return typeof gl.getParameter === 'function';
  } catch (err) {
    return false;
  }
}

export function isLikelyLowPower() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const cores = nav.hardwareConcurrency || 4;
  const saveData = nav.connection && nav.connection.saveData;
  const slowConnection = nav.connection && ['slow-2g', '2g'].includes(nav.connection.effectiveType);
  return cores <= 2 || Boolean(saveData) || Boolean(slowConnection);
}

export function shouldRunHeroScene() {
  if (prefersReducedMotion()) return false;
  if (!hasWebGL()) return false;
  if (isLikelyLowPower()) return false;
  return true;
}
