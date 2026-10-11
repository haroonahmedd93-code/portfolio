/**
 * Case pages: the sticky chapter pill swaps "01 Challenge" → "02 Design process"
 * as chapters pass (C3): .4s power3.out, label rolls, width animates.
 */
import { gsap, ScrollTrigger } from '../core/gsap';
import { rm } from '../core/rm';

export function initChapterPill() {
  const pillEl = document.querySelector<HTMLElement>('[data-chapter-pill]');
  const numEl = document.querySelector<HTMLElement>('[data-chapter-num]');
  const labelEl = document.querySelector<HTMLElement>('[data-chapter-label]');
  if (!pillEl || !numEl || !labelEl) return;
  const pill = pillEl, num = numEl, label = labelEl;

  const bands = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'));
  let current = bands[0]?.dataset.chapter ?? '01';

  function swap(index: string, text: string) {
    if (index === current) return;
    current = index;
    const inner = label.querySelector('span')!;
    if (rm.reduced) {
      num.textContent = index;
      inner.textContent = text;
      return;
    }
    const startW = pill.getBoundingClientRect().width;
    const next = document.createElement('span');
    next.textContent = text;
    gsap.set(next, { position: 'absolute', left: 0, top: 0, yPercent: 100 });
    label.appendChild(next);
    // measure the new width
    const probe = inner.cloneNode(true) as HTMLElement;
    probe.textContent = text;
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
    label.appendChild(probe);
    const nextLabelW = probe.getBoundingClientRect().width;
    probe.remove();
    const endW = startW - inner.getBoundingClientRect().width + nextLabelW;

    gsap.set(pill, { width: startW });
    gsap
      .timeline({
        defaults: { duration: 0.4, ease: 'power3.out' },
        onComplete() {
          inner.textContent = text;
          gsap.set(inner, { yPercent: 0 });
          next.remove();
          gsap.set(pill, { clearProps: 'width' });
          gsap.set(label, { width: 'auto' });
        },
      })
      .to(inner, { yPercent: -100 }, 0)
      .to(next, { yPercent: 0 }, 0)
      .to(label, { width: nextLabelW }, 0)
      .to(pill, { width: endW }, 0)
      .call(() => (num.textContent = index), [], 0.12);
  }

  for (const band of bands) {
    ScrollTrigger.create({
      trigger: band,
      start: 'top 40%',
      end: 'bottom 40%',
      onToggle(self) {
        if (self.isActive) swap(band.dataset.chapter!, band.dataset.chapterLabel!);
      },
    });
  }
}
