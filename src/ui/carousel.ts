/**
 * Work carousels (W6/W7/W8): Draggable + InertiaPlugin throw with snap to
 * slides, dots, keyboard, side slides bend away in perspective (page-bend),
 * frames fold at the viewport edge.
 */
import { gsap, ScrollTrigger } from '../core/gsap';
import { Draggable } from 'gsap/Draggable';
import { rm, coarsePointer } from '../core/rm';
import { openLightbox } from './lightbox';

gsap.registerPlugin(Draggable);

function cssNum(name: string, fallback: number) {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
}

export function initCarousels() {
  const carousels = Array.from(document.querySelectorAll<HTMLElement>('[data-carousel]'));
  for (const c of carousels) initCarousel(c);
}

function initCarousel(root: HTMLElement) {
  const track = root.querySelector<HTMLElement>('[data-carousel-track]')!;
  const slides = Array.from(track.querySelectorAll<HTMLElement>('.carousel__slide'));
  const dots = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-dot]'));
  if (!slides.length) return;

  let positions: number[] = []; // x (track translate) that centres each slide
  let current = 0;
  let x = 0;

  function measure() {
    const vw = root.clientWidth;
    positions = slides.map((s) => -(s.offsetLeft + s.offsetWidth / 2 - vw / 2));
  }

  function setActive(i: number) {
    current = i;
    slides.forEach((s, k) => s.classList.toggle('is-active', k === i));
    dots.forEach((d, k) => {
      d.classList.toggle('is-active', k === i);
      k === i ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current');
    });
  }

  function bend() {
    const depth = cssNum('--bend-depth', 260);
    if (depth === 0) return;
    const vw = root.clientWidth;
    for (const s of slides) {
      const cx = s.offsetLeft + s.offsetWidth / 2 + x; // centre in viewport space
      const d = gsap.utils.clamp(-1, 1, (cx - vw / 2) / vw);
      const ry = -d * 18; // degrees
      const tz = -Math.abs(d) * depth * 0.6;
      s.style.transform = `perspective(1200px) rotateY(${ry}deg) translateZ(${tz}px)`;
    }
  }

  function render() {
    track.style.transform = `translate3d(${x}px,0,0)`;
    bend();
    // nearest slide
    let best = 0;
    let bd = Infinity;
    positions.forEach((p, i) => {
      const d = Math.abs(p - x);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    if (best !== current) setActive(best);
  }

  function goTo(i: number, animate = true) {
    i = gsap.utils.clamp(0, slides.length - 1, i);
    if (!animate || rm.reduced) {
      x = positions[i];
      render();
      return;
    }
    gsap.to(proxy, { x: positions[i], duration: 0.6, ease: 'power3.out', onUpdate: () => { x = gsap.getProperty(proxy, 'x') as number; render(); } });
  }

  const proxy = document.createElement('div'); // Draggable needs a DOM target; we read its x
  measure();
  x = positions[0];
  render();

  // drag + inertia
  if (!rm.reduced) {
    Draggable.create(proxy, {
      type: 'x',
      trigger: track,
      inertia: true,
      edgeResistance: 0.85,
      bounds: { minX: positions[positions.length - 1], maxX: positions[0] },
      snap: { x: (v) => gsap.utils.snap(positions, v) },
      onPress() {
        gsap.killTweensOf(proxy);
        gsap.set(proxy, { x });
        this.update();
        track.classList.add('is-dragging');
      },
      onDrag() {
        x = this.x;
        render();
      },
      onThrowUpdate() {
        x = this.x;
        render();
      },
      onRelease() {
        track.classList.remove('is-dragging');
      },
      onClick(e: PointerEvent) {
        const fig = (e.target as HTMLElement).closest<HTMLElement>('[data-lightbox]');
        if (fig) openLightbox(fig);
      },
    });
  } else {
    track.addEventListener('click', (e) => {
      const fig = (e.target as HTMLElement).closest<HTMLElement>('[data-lightbox]');
      if (fig) openLightbox(fig);
    });
  }

  dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));
  track.tabIndex = 0;
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') goTo(current + 1);
    if (e.key === 'ArrowLeft') goTo(current - 1);
  });

  // touch: horizontal pan is the carousel, vertical stays the page (touch-action: pan-y in CSS)
  void coarsePointer;

  window.addEventListener('resize', () => {
    measure();
    goTo(current, false);
  });

  // W8 — fold at the viewport edge (CSS 3D)
  if (!rm.reduced) {
    const angle = cssNum('--fold-angle', 64);
    if (angle > 0) {
      ScrollTrigger.create({
        trigger: root,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        onUpdate(self) {
          // p 0 → entering from the bottom, 1 → leaving at the top
          const p = self.progress;
          const zone = 0.22;
          let rx = 0;
          let origin = '50% 0%';
          if (p < zone) {
            rx = angle * (1 - p / zone); // bottom edge folds away as it enters
            origin = '50% 0%';
          } else if (p > 1 - zone) {
            rx = -angle * ((p - (1 - zone)) / zone); // top edge folds as it leaves
            origin = '50% 100%';
          }
          track.style.transformOrigin = origin;
          track.style.transform = `translate3d(${x}px,0,0) perspective(${cssNum('--fold-persp', 1100)}px) rotateX(${rx}deg)`;
          track.style.opacity = String(1 - Math.abs(rx) / angle * 0.5);
        },
      });
    }
  }
}
