// Minimal fade-to-page transition used when a gallery panel or list row is
// selected. Keeps things simple: fade an overlay in, then navigate.
export function navigateWithFade(url) {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;inset:0;background:#0b0b0f;opacity:0;z-index:400;pointer-events:none;transition:opacity .35s ease;';
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.opacity = '1';
  });
  setTimeout(() => {
    window.location.href = url;
  }, 320);
}
