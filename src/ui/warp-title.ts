/**
 * title-warp (W1/W3/A8): the title lies back on a plane (--warp-angle 78°) and
 * stands up as it scrolls through ~80vh. CSS 3D stand-in for their WebGL pass,
 * tuned by the same CSS variables. "big" = the FEATURED PROJECTS title.
 */
import { gsap } from '../core/gsap';
import { rm } from '../core/rm';

function cssNum(name: string, fallback: number) {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}

export function initWarpTitles() {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-warp-title]'));
  for (const el of els) {
    const big = el.dataset.warpTitle === 'big';
    if (rm.reduced) {
      gsap.from(el, { opacity: 0, duration: 0.6, scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
      continue;
    }
    const angle = cssNum('--warp-angle', 78);
    const rise = cssNum('--warp-rise', 3) * (big ? 1 : 0.4);
    const persp = cssNum('--warp-persp', 420);
    const parent = el.parentElement!;
    parent.style.perspective = `${persp}px`;
    parent.style.perspectiveOrigin = '50% 100%';
    gsap.set(el, { transformOrigin: '50% 100%', transformStyle: 'preserve-3d' });
    gsap.fromTo(
      el,
      { rotateX: angle, yPercent: 10 * rise, opacity: 0.5, scale: 0.9 },
      {
        rotateX: 0,
        yPercent: 0,
        opacity: 1,
        scale: 1,
        ease: 'power2.out', // their warp-ease 1.7 ≈ an eased-out curve
        scrollTrigger: { trigger: parent, start: 'top 95%', end: big ? 'top 20%' : 'top 55%', scrub: true },
      },
    );
  }
}
