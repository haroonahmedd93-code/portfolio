/**
 * #intro — opening order (H1–H4, simplified until Stage 3/4 add SplitText),
 * the Three.js dome wall, and the scroll dolly (H5/H7).
 */
import { gsap, ScrollTrigger } from '../core/gsap';
import { rm } from '../core/rm';
import type { HeroWall } from '../gl/hero-wall';

export async function initIntro() {
  const section = document.querySelector<HTMLElement>('#intro');
  if (!section) return;

  const stage = section.querySelector<HTMLElement>('.lede-stage')!;
  const wallEl = section.querySelector<HTMLElement>('[data-wall]')!;
  const canvas = section.querySelector<HTMLCanvasElement>('[data-wall-canvas]')!;
  const fallback = section.querySelector<HTMLElement>('[data-wall-fallback]')!;
  const fade = section.querySelector<HTMLElement>('[data-wall-fade]')!;
  const lede = section.querySelector<HTMLElement>('[data-lede]')!;
  const line = section.querySelector<HTMLElement>('[data-lede-line]')!;
  const title = section.querySelector<HTMLElement>('[data-lede-title] > span')!;
  const script = section.querySelector<HTMLElement>('[data-lede-script]')!;

  const tiles = Array.from(fallback.querySelectorAll<HTMLImageElement>('img'))
    .map((img) => img.getAttribute('src')!)
    .filter((src, i, arr) => arr.indexOf(src) === i);

  let wall: HeroWall | null = null;
  if (!rm.reduced) {
    const { createHeroWall } = await import('../gl/hero-wall'); // three.js lives in its own chunk
    wall = createHeroWall({ canvas, tiles });
  }

  if (wall) {
    wallEl.classList.add('wall--gl');
  } else {
    wallEl.classList.add('wall--static');
  }

  /* ---- opening order ------------------------------------------------------- */
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  if (rm.reduced) {
    tl.from([line, title, script], { opacity: 0, duration: 0.6, stagger: 0.1 });
  } else {
    gsap.set(lede, { opacity: 1 });
    tl.from(line, { yPercent: 100, opacity: 0, duration: 0.9 }, 0) // H1
      .from(title, { yPercent: 110, duration: 1.0 }, 0.15) // H2 (masked by .lede__title overflow)
      .fromTo(script, { clipPath: 'inset(-20% 100% -20% 0)' }, { clipPath: 'inset(-20% 0% -20% 0)', duration: 1.2, ease: 'power2.inOut' }, 0.45); // H3
  }

  if (wall) {
    document.fonts.ready.then(() => {
      wall!.start();
      tl.add(wall!.reveal(), 0.55); // H4: wall arrives after the type has started
    });
  }

  /* ---- scroll dolly (H5/H7) ---------------------------------------------- */
  if (!rm.reduced) {
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate(self) {
        const p = self.progress;
        wall?.setProgress(p);
        // type fades first, fade-to-black last
        lede.style.opacity = String(1 - gsap.utils.clamp(0, 1, p / 0.28));
        lede.style.transform = `translateY(${p * -6}vh)`;
        fade.style.opacity = String(gsap.utils.clamp(0, 1, (p - 0.72) / 0.28));
      },
    });
  } else {
    stage.classList.add('is-static');
  }

  return { wall };
}
