/**
 * Gradual blur at the base of the viewport (after React Bits' GradualBlur):
 * a stack of backdrop-filter layers, each masked to a band, so the blur ramps
 * up smoothly towards the bottom edge. Shown while the Works list is in view.
 */
import { gsap, ScrollTrigger } from '../core/gsap';
import { rm } from '../core/rm';

interface Options {
  height?: string;
  strength?: number;
  divCount?: number;
  exponential?: boolean;
  curve?: 'linear' | 'bezier' | 'ease-in' | 'ease-out';
}

const CURVES = {
  linear: (p: number) => p,
  bezier: (p: number) => p * p * (3 - 2 * p),
  'ease-in': (p: number) => p * p,
  'ease-out': (p: number) => 1 - Math.pow(1 - p, 2),
};

export function createGradualBlur(opts: Options = {}) {
  const { height = '9rem', strength = 2, divCount = 6, exponential = true, curve = 'bezier' } = opts;
  const root = document.createElement('div');
  root.className = 'gradual-blur';
  root.setAttribute('aria-hidden', 'true');
  root.style.height = height;
  const inc = 100 / divCount;
  const f = CURVES[curve];
  for (let i = 1; i <= divCount; i++) {
    const progress = f(i / divCount);
    const blur = exponential ? Math.pow(2, progress * 4) * 0.0625 * strength : 0.0625 * (progress * divCount + 1) * strength;
    const p1 = (inc * i - inc).toFixed(1);
    const p2 = (inc * i).toFixed(1);
    const p3 = (inc * i + inc).toFixed(1);
    const p4 = (inc * i + inc * 2).toFixed(1);
    let gradient = `transparent ${p1}%, black ${p2}%`;
    if (inc * i + inc <= 100) gradient += `, black ${p3}%`;
    if (inc * i + inc * 2 <= 100) gradient += `, transparent ${p4}%`;
    const layer = document.createElement('div');
    layer.style.cssText = `position:absolute;inset:0;-webkit-mask-image:linear-gradient(to bottom, ${gradient});mask-image:linear-gradient(to bottom, ${gradient});-webkit-backdrop-filter:blur(${blur.toFixed(3)}rem);backdrop-filter:blur(${blur.toFixed(3)}rem);`;
    root.appendChild(layer);
  }
  // a faint dark ramp underneath the blur so the base settles into black
  const shade = document.createElement('div');
  shade.style.cssText = 'position:absolute;inset:0;background:linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.55));';
  root.appendChild(shade);
  document.body.appendChild(root);
  return root;
}

/** Fade the blur in while any of the given sections is in view. */
export function initGradualBlur(selectors: string[]) {
  if (rm.reduced) return;
  const targets = selectors.map((s) => document.querySelector<HTMLElement>(s)).filter(Boolean) as HTMLElement[];
  if (!targets.length) return;
  const el = createGradualBlur();
  let visibleCount = 0;
  const apply = () => gsap.to(el, { opacity: visibleCount > 0 ? 1 : 0, duration: 0.45, ease: 'power2.out', overwrite: true });
  for (const t of targets) {
    ScrollTrigger.create({
      trigger: t,
      start: 'top 90%',
      end: 'bottom 60%',
      onToggle(self) {
        visibleCount += self.isActive ? 1 : -1;
        apply();
      },
    });
  }
}
