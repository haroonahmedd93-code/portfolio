/**
 * Lightbox (C5): a frame grows from its rect to the centre, corners interpolate.
 * Esc / outside click close; focus is trapped on the close button.
 */
import { gsap } from '../core/gsap';
import { rm } from '../core/rm';

let root: HTMLElement | null = null;
let img: HTMLImageElement | null = null;
let closeBtn: HTMLButtonElement | null = null;
let lastFocus: Element | null = null;
let open = false;

function ensure() {
  root = document.querySelector<HTMLElement>('[data-lightbox-root]');
  img = root?.querySelector<HTMLImageElement>('[data-lightbox-img]') ?? null;
  closeBtn = root?.querySelector<HTMLButtonElement>('[data-lightbox-close]') ?? null;
  if (!root || !img || !closeBtn) return false;
  root.addEventListener('click', (e) => {
    if (e.target === root || e.target === closeBtn) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (open && e.key === 'Escape') closeLightbox();
    if (open && e.key === 'Tab') {
      e.preventDefault();
      closeBtn?.focus();
    }
  });
  return true;
}

export function openLightbox(fig: HTMLElement) {
  if (!root && !ensure()) return;
  const src = fig.dataset.lightbox!;
  const source = fig.querySelector('img');
  lastFocus = document.activeElement;
  open = true;
  root!.classList.add('is-open');
  root!.setAttribute('aria-hidden', 'false');
  root!.removeAttribute('inert');
  img!.src = src;
  img!.alt = source?.alt ?? '';
  closeBtn!.focus();
  if (rm.reduced) return;
  // rect → centre morph
  const from = fig.getBoundingClientRect();
  gsap.set(img, { clearProps: 'all' });
  const to = img!.getBoundingClientRect();
  const sx = from.width / Math.max(to.width, 1);
  const sy = from.height / Math.max(to.height, 1);
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  gsap.fromTo(
    img,
    { x: dx, y: dy, scaleX: sx, scaleY: sy, borderRadius: getComputedStyle(fig).borderRadius },
    { x: 0, y: 0, scaleX: 1, scaleY: 1, borderRadius: '24px', duration: 0.6, ease: 'expo.out' },
  );
  gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.4 });
}

export function closeLightbox() {
  if (!root || !open) return;
  open = false;
  root.classList.remove('is-open');
  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('inert', '');
  (lastFocus as HTMLElement | null)?.focus?.();
}
