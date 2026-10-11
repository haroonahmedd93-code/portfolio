/**
 * Case page: C1 load reveals, C2/C5 folds, C4 highlight, chapter pill, lightbox.
 */
import { gsap, ScrollTrigger } from '../core/gsap';
import { rm } from '../core/rm';
import { highlight, revealChars, revealWords, riseIn } from '../core/reveal';
import { initChapterPill } from '../ui/chapter-pill';
import { openLightbox } from '../ui/lightbox';

function cssNum(name: string, fallback: number) {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}

export function initCase() {
  const main = document.querySelector<HTMLElement>('main.case');
  if (!main) return;

  // C1 — title chars, intro words, meta rows
  const title = main.querySelector<HTMLElement>('.case-head__title');
  const intro = main.querySelector<HTMLElement>('[data-reveal-words]');
  const rows = Array.from(main.querySelectorAll<HTMLElement>('[data-reveal-rows] > div'));
  if (title) revealChars(title, { immediate: true, stagger: 0.03 });
  if (intro) revealWords(intro, { immediate: true, delay: 0.25, stagger: 0.02 });
  if (rows.length) riseIn(rows, { immediate: true, delay: 0.5 });

  // band titles + highlight copy
  for (const t of main.querySelectorAll<HTMLElement>('.band__title[data-reveal-chars]')) revealChars(t, { stagger: 0.02 });
  for (const c of main.querySelectorAll<HTMLElement>('[data-highlight] > .copy')) highlight(c); // paragraphs only; headings stay white

  // C2 / C5 — folds at the viewport edges
  if (!rm.reduced) {
    const angle = cssNum('--fold-angle', 64);
    for (const fig of main.querySelectorAll<HTMLElement>('[data-fold]')) {
      const img = fig.querySelector('img')!;
      const hero = fig.dataset.fold === 'hero';
      ScrollTrigger.create({
        trigger: fig,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        onUpdate(self) {
          const p = self.progress;
          const zone = hero ? 0.35 : 0.25;
          let rx = 0;
          let origin = '50% 0%';
          let op = 1;
          if (!hero && p < zone) {
            rx = angle * (1 - p / zone);
            origin = '50% 0%';
            op = 0.35 + 0.65 * (p / zone);
          } else if (p > 1 - zone) {
            const t = (p - (1 - zone)) / zone;
            rx = -angle * t;
            origin = '50% 100%';
            op = 1 - t * 0.7;
          }
          img.style.transformOrigin = origin;
          img.style.transform = `perspective(${cssNum('--fold-persp', 1100)}px) rotateX(${rx}deg)`;
          img.style.opacity = String(op);
        },
      });
    }
  }

  // lightbox on feature shots
  for (const fig of main.querySelectorAll<HTMLElement>('[data-lightbox]')) {
    fig.style.cursor = 'zoom-in';
    fig.addEventListener('click', () => openLightbox(fig));
  }

  initChapterPill();
  gsap.delayedCall(0.1, () => ScrollTrigger.refresh());
}
