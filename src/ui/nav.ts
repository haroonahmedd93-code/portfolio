/**
 * Header: items in (N1), sliding pill thumb (N2), Lenis anchor scroll (N3).
 */
import { gsap, ScrollTrigger } from '../core/gsap';
import { lenis } from '../core/lenis';
import { rm } from '../core/rm';
import { riseIn } from '../core/reveal';

export function initNav() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;

  // N1 — header items rise in
  riseIn(Array.from(header.children) as Element[], { immediate: true, delay: 0.2 });

  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-nav]'));
  const thumb = document.querySelector<HTMLElement>('[data-nav-thumb]');
  if (!links.length || !thumb) return;

  let active = links[0];

  function moveThumb(link: HTMLAnchorElement, instant = false) {
    const track = thumb!.parentElement!;
    const tr = track.getBoundingClientRect();
    const lr = link.getBoundingClientRect();
    const x = lr.left - tr.left;
    if (instant || rm.reduced) {
      gsap.set(thumb, { x, width: lr.width });
      return;
    }
    // slight stretch mid-move, then settle (N2: .45s power3.out)
    const from = gsap.getProperty(thumb, 'x') as number;
    const dir = x > from ? 1 : -1;
    gsap
      .timeline()
      .to(thumb, { x, width: lr.width, duration: 0.45, ease: 'power3.out' }, 0)
      .to(thumb, { scaleX: 1.12, transformOrigin: dir > 0 ? '0% 50%' : '100% 50%', duration: 0.2, ease: 'power2.out' }, 0)
      .to(thumb, { scaleX: 1, duration: 0.3, ease: 'power3.out' }, 0.2);
  }

  function setActive(link: HTMLAnchorElement) {
    if (link === active) return;
    active.classList.remove('is-active');
    active.removeAttribute('aria-current');
    link.classList.add('is-active');
    link.setAttribute('aria-current', 'location');
    active = link;
    moveThumb(link);
  }

  // initial placement once fonts are in (widths depend on them)
  document.fonts.ready.then(() => moveThumb(active, true));
  window.addEventListener('resize', () => moveThumb(active, true));

  // active section from ScrollTrigger per target (N2)
  for (const link of links) {
    const target = document.getElementById(link.dataset.nav!);
    if (!target) continue;
    ScrollTrigger.create({
      trigger: target,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle(self) {
        if (self.isActive) setActive(link);
      },
    });
  }
  // outro counts as "About"
  const outro = document.querySelector('#outro');
  if (outro) {
    ScrollTrigger.create({
      trigger: outro,
      start: 'top 50%',
      end: 'bottom bottom',
      onToggle(self) {
        if (self.isActive) setActive(links[links.length - 1]);
      },
    });
  }

  // N3 — click: Lenis scrollTo, no hash change
  for (const link of links) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById(link.dataset.nav!);
      if (!target) return;
      if (rm.reduced) {
        target.scrollIntoView();
        return;
      }
      lenis.scrollTo(target, { duration: 1.15, easing: (t: number) => 1 - Math.pow(2, -10 * t) });
    });
  }
}
