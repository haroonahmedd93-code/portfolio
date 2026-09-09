import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../three/capability.js';

gsap.registerPlugin(ScrollTrigger);

// Applies to any element with [data-reveal]. Motion is skipped entirely (elements
// simply appear) when the user has asked for reduced motion.
export function initRevealAnimations(root = document) {
  const targets = root.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  if (prefersReducedMotion()) {
    targets.forEach((el) => el.removeAttribute('data-reveal'));
    return;
  }

  targets.forEach((el, i) => {
    const group = el.getAttribute('data-reveal-group');
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 28 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        delay: group ? (i % 6) * 0.06 : 0,
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          once: true,
        },
      }
    );
  });
}

export function initHeroIntro(selector = '.hero__content > *') {
  if (prefersReducedMotion()) return;
  gsap.fromTo(
    selector,
    { autoAlpha: 0, y: 24 },
    { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.1, delay: 0.15 }
  );
}
