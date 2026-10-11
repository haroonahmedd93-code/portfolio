/**
 * Shared text reveals (02-motion-spec): SplitText masks, highlight-text scrub.
 * Every helper is a no-op-ish fade under reduced motion.
 */
import { gsap, ScrollTrigger } from './gsap';
import { SplitText } from 'gsap/SplitText';
import { rm } from './rm';

gsap.registerPlugin(SplitText);

const START = 'top 80%';
/** aria-label is only valid on headings; paragraphs/spans get plain word splits. */
const aria = (el: Element) => (/^H[1-6]$/.test(el.tagName) ? 'auto' : 'none') as 'auto' | 'none';

/** Lines rise out of a mask (M1): .9s expo.out, .08 stagger. */
export function revealLines(el: Element, opts: { stagger?: number; start?: string; delay?: number } = {}) {
  if (rm.reduced) return gsap.from(el, { opacity: 0, duration: 0.6, scrollTrigger: { trigger: el, start: opts.start ?? START, once: true } });
  const split = SplitText.create(el, { type: 'lines', linesClass: 'sl', mask: 'lines', aria: aria(el) });
  return gsap.from(split.lines, {
    yPercent: 100,
    opacity: 0,
    duration: 0.9,
    ease: 'expo.out',
    stagger: opts.stagger ?? 0.08,
    delay: opts.delay ?? 0,
    scrollTrigger: { trigger: el, start: opts.start ?? START, once: true },
  });
}

/** Chars rise out of a mask (H2/O1/C1): 1s expo.out, .02–.03 stagger. */
export function revealChars(el: Element, opts: { stagger?: number; start?: string; delay?: number; immediate?: boolean } = {}) {
  if (rm.reduced) {
    return gsap.from(el, { opacity: 0, duration: 0.6, ...(opts.immediate ? {} : { scrollTrigger: { trigger: el, start: opts.start ?? START, once: true } }) });
  }
  const split = SplitText.create(el, { type: 'chars,words', charsClass: 'ch', mask: 'chars', aria: aria(el) });
  return gsap.from(split.chars, {
    yPercent: 110,
    duration: 1,
    ease: 'expo.out',
    stagger: opts.stagger ?? 0.02,
    delay: opts.delay ?? 0,
    ...(opts.immediate ? {} : { scrollTrigger: { trigger: el, start: opts.start ?? START, once: true } }),
  });
}

/** Words fade/rise (H1/C1): .9s expo.out, .055 stagger. */
export function revealWords(el: Element, opts: { stagger?: number; start?: string; delay?: number; immediate?: boolean } = {}) {
  if (rm.reduced) {
    return gsap.from(el, { opacity: 0, duration: 0.6, ...(opts.immediate ? {} : { scrollTrigger: { trigger: el, start: opts.start ?? START, once: true } }) });
  }
  const split = SplitText.create(el, { type: 'words', wordsClass: 'wd', mask: 'words', aria: aria(el) });
  return gsap.from(split.words, {
    yPercent: 100,
    opacity: 0,
    duration: 0.9,
    ease: 'expo.out',
    stagger: opts.stagger ?? 0.055,
    delay: opts.delay ?? 0,
    ...(opts.immediate ? {} : { scrollTrigger: { trigger: el, start: opts.start ?? START, once: true } }),
  });
}

/** Simple rise for small groups (N1/W2): .6s power3.out, .06 stagger. */
export function riseIn(targets: Element | Element[], opts: { start?: string; delay?: number; immediate?: boolean; trigger?: Element } = {}) {
  const list = Array.isArray(targets) ? targets : [targets];
  if (rm.reduced) return gsap.from(list, { opacity: 0, duration: 0.5, stagger: 0.06, ...(opts.immediate ? {} : { scrollTrigger: { trigger: opts.trigger ?? list[0], start: opts.start ?? START, once: true } }) });
  return gsap.from(list, {
    y: 20,
    opacity: 0,
    duration: 0.6,
    ease: 'power3.out',
    stagger: 0.06,
    delay: opts.delay ?? 0,
    ...(opts.immediate ? {} : { scrollTrigger: { trigger: opts.trigger ?? list[0], start: opts.start ?? START, once: true } }),
  });
}

/** highlight-text (W4/B3/C4): words go dim → white, scrubbed through the viewport. */
export function highlight(el: Element) {
  if (rm.reduced) return;
  const split = SplitText.create(el, { type: 'words', wordsClass: 'word', aria: 'none' });
  el.classList.add('highlight');
  const words = split.words;
  ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    end: 'bottom 45%',
    scrub: true,
    onUpdate(self) {
      const lit = Math.round(self.progress * words.length);
      words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
    },
  });
}

/** About title (B1): faint outline that becomes solid as you scroll. */
export function revealOutline(el: HTMLElement) {
  if (rm.reduced) return;
  gsap.set(el, { color: 'rgba(255,255,255,0)', webkitTextStroke: '1px rgba(255,255,255,.35)' });
  gsap.to(el, {
    color: '#ffffff',
    webkitTextStroke: '0.026em #ffffff',
    ease: 'none',
    scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 40%', scrub: true },
  });
}
