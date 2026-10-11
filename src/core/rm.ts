/** prefers-reduced-motion, as a live flag plus a subscription. */
const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

export const rm = {
  get reduced() {
    return mq.matches;
  },
  onChange(fn: (reduced: boolean) => void) {
    mq.addEventListener('change', (e) => fn(e.matches));
  },
};

export const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
