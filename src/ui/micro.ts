/**
 * Stage 7 micro-interactions: link rolls (O4), copy-email toast (O3),
 * logo ink (N5), button label roll (W5).
 */
import { gsap } from '../core/gsap';
import { rm } from '../core/rm';

/** Doubled-letter roll: each char becomes a 2-high stack that slides up on hover. */
export function initRollLinks() {
  if (rm.reduced) return;
  const links = document.querySelectorAll<HTMLElement>('.link--roll');
  for (const link of links) {
    const text = link.textContent ?? '';
    link.setAttribute('aria-label', text.trim());
    link.textContent = '';
    [...text].forEach((ch, i) => {
      const wrap = document.createElement('span');
      wrap.className = 'roll';
      wrap.style.setProperty('--i', String(i));
      wrap.setAttribute('aria-hidden', 'true');
      const a = document.createElement('span');
      a.textContent = ch === ' ' ? ' ' : ch;
      const b = a.cloneNode(true);
      wrap.append(a, b);
      link.appendChild(wrap);
    });
  }
  // ghost pill buttons: label rolls too
  for (const btn of document.querySelectorAll<HTMLElement>('.btn[data-roll] .btn__label')) {
    const text = btn.textContent ?? '';
    btn.textContent = '';
    btn.classList.add('link--roll');
    [...text].forEach((ch, i) => {
      const wrap = document.createElement('span');
      wrap.className = 'roll';
      wrap.style.setProperty('--i', String(i));
      const a = document.createElement('span');
      a.textContent = ch === ' ' ? ' ' : ch;
      wrap.append(a, a.cloneNode(true));
      btn.appendChild(wrap);
    });
    btn.closest('.btn')!.setAttribute('aria-label', text.trim());
  }
}

/** Click the email → clipboard + toast; keyboard Enter copies; mailto stays as fallback. */
export function initCopyEmail() {
  const toast = document.querySelector<HTMLElement>('[data-toast]');
  const links = document.querySelectorAll<HTMLAnchorElement>('[data-copy-email]');
  if (!toast || !links.length) return;
  let hide: gsap.core.Tween | null = null;

  function show(text: string) {
    toast!.textContent = text;
    hide?.kill();
    if (rm.reduced) {
      gsap.set(toast, { opacity: 1, y: 0, xPercent: -50 });
      hide = gsap.to(toast, { opacity: 0, delay: 1.6, duration: 0.3 });
      return;
    }
    gsap.fromTo(toast, { yPercent: 140, opacity: 0, xPercent: -50 }, { yPercent: 0, opacity: 1, xPercent: -50, duration: 0.3, ease: 'back.out(2.5)' });
    hide = gsap.to(toast, { yPercent: 140, opacity: 0, xPercent: -50, delay: 1.6, duration: 0.3, ease: 'power2.in' });
  }

  for (const link of links) {
    link.addEventListener('click', async (e) => {
      const email = link.getAttribute('href')!.replace('mailto:', '');
      if (!navigator.clipboard) return; // mailto fallback
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(email);
        show('Copied to clipboard!');
      } catch {
        window.location.href = link.getAttribute('href')!;
      }
    });
  }
}

/** Logo ink: the signature soaks in from left to right on load, and on hover. */
export function initLogoInk() {
  const ink = document.querySelector<HTMLElement>('[data-logo-ink]');
  if (!ink) return;
  if (rm.reduced) return;
  const play = () =>
    gsap.fromTo(
      ink,
      { clipPath: 'inset(-20% 100% -20% 0)', filter: 'blur(2px)' },
      { clipPath: 'inset(-20% 0% -20% 0)', filter: 'blur(0px)', duration: 0.8, ease: 'power2.out' },
    );
  play();
  ink.closest('a')?.addEventListener('mouseenter', () => play());
}
