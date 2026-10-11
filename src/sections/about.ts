/**
 * #about (B1–B4) and #outro (O1/O2).
 */
import { gsap, ScrollTrigger } from '../core/gsap';
import { rm } from '../core/rm';
import { highlight, revealChars, revealOutline } from '../core/reveal';

export function initAbout() {
  const section = document.querySelector<HTMLElement>('#about');
  if (!section) return;
  const title = section.querySelector<HTMLElement>('[data-reveal-outline]');
  const media = section.querySelector<HTMLElement>('[data-about-media] img');
  const text = section.querySelector<HTMLElement>('[data-highlight]');
  const sig = section.querySelector<HTMLElement>('[data-signature]');

  if (title) revealOutline(title);
  if (text) highlight(text);

  if (media && !rm.reduced) {
    // B2 — portrait zoom 1.16 → 1
    gsap.fromTo(media, { scale: 1.16 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true } });
  }
  if (sig) {
    // B4 — signature "draws" left → right (clip wipe stands in for the stroke draw until the SVG arrives)
    if (rm.reduced) return;
    gsap.fromTo(
      sig,
      { clipPath: 'inset(-20% 100% -20% 0)' },
      { clipPath: 'inset(-20% 0% -20% 0)', duration: 1.6, ease: 'power2.inOut', scrollTrigger: { trigger: sig, start: 'top 70%', once: true } },
    );
  }
}

export function initOutro() {
  const outro = document.querySelector<HTMLElement>('[data-outro]');
  if (!outro) return;
  for (const t of outro.querySelectorAll<HTMLElement>('[data-reveal-chars]')) revealChars(t, { stagger: 0.02, start: 'top 85%' });
  const glow = outro.querySelector<HTMLElement>('[data-outro-glow]');
  if (glow && !rm.reduced) {
    // O2 — brighter as you reach the bottom + a slow 3s breathe
    gsap.fromTo(glow, { opacity: 0.35 }, { opacity: 0.9, ease: 'none', scrollTrigger: { trigger: outro, start: 'top 80%', end: 'bottom bottom', scrub: true } });
    gsap.to(glow, { scale: 1.08, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% 100%' });
  }
  ScrollTrigger.refresh();
}
