import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';
import { rm } from './rm';

/**
 * G1/G2 — Lenis with the original's config, clocked by the GSAP ticker and
 * feeding ScrollTrigger. Under reduced motion the wheel is native.
 */
export const lenis = new Lenis({
  lerp: 0.075,
  wheelMultiplier: 0.9,
  syncTouch: false,
  smoothWheel: !rm.reduced,
});

lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));

rm.onChange((reduced) => {
  lenis.options.smoothWheel = !reduced;
});

document.documentElement.classList.add('lenis');
