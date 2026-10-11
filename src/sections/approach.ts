/**
 * #approach — the 800vh pinned stage (A0): four scenes crossfade, the shared
 * title/body slot swaps (A1/A2), the index ticks. Scenes are lazy-loaded.
 */
import { gsap, ScrollTrigger } from '../core/gsap';
import { rm } from '../core/rm';
import type { Scene } from '../gl/scenes/types';

const ORDER = ['listen', 'simplify', 'craft', 'prove'] as const;
type Id = (typeof ORDER)[number];
const SEG = 1 / ORDER.length;
const FADE = 0.035; // crossfade width in global progress units

export async function initApproach() {
  const section = document.querySelector<HTMLElement>('[data-approach]');
  const stage = section?.querySelector<HTMLElement>('[data-approach-stage]');
  if (!section || !stage) return;

  if (rm.reduced) {
    section.classList.add('is-static');
    return;
  }

  const titles = Object.fromEntries(ORDER.map((id) => [id, section.querySelector<HTMLElement>(`[data-pillar-title="${id}"]`)!])) as Record<Id, HTMLElement>;
  const notes = Object.fromEntries(ORDER.map((id) => [id, section.querySelector<HTMLElement>(`[data-pillar-note="${id}"]`)!])) as Record<Id, HTMLElement>;
  const sceneEls = Object.fromEntries(ORDER.map((id) => [id, section.querySelector<HTMLElement>(`[data-scene="${id}"]`)!])) as Record<Id, HTMLElement>;
  const index = section.querySelector<HTMLElement>('[data-approach-index]')!;

  // scenes
  const [{ createListening }, { createFocus }, { createCraft }, { createValidation }] = await Promise.all([
    import('../gl/scenes/listening'),
    import('../gl/scenes/focus'),
    import('../gl/scenes/craft'),
    import('../gl/scenes/validation'),
  ]);
  const scenes: Record<Id, Scene> = { listen: createListening(), simplify: createFocus(), craft: createCraft(), prove: createValidation() };
  for (const id of ORDER) scenes[id].mount(sceneEls[id].querySelector('canvas')!);
  const ro = new ResizeObserver(() => ORDER.forEach((id) => scenes[id].resize()));
  ro.observe(stage);

  let active: Id | null = null;
  let inView = false;

  function activate(id: Id | null) {
    if (id === active) return;
    if (active) scenes[active].setActive(false);
    active = id;
    if (id && inView) scenes[id].setActive(true);
  }

  // per-pillar text state: 0 hidden-before, 1 shown, 2 hidden-after
  function applyText(id: Id, local: number) {
    // local: 0..1 inside its segment; enter over first FADE/SEG, exit over last FADE/SEG
    const f = FADE / SEG;
    const enter = gsap.utils.clamp(0, 1, local / f);
    const exit = gsap.utils.clamp(0, 1, (1 - local) / f);
    const vis = Math.min(enter, exit);
    const title = titles[id];
    const note = notes[id];
    const e = gsap.parseEase('power2.inOut')(vis);
    title.style.opacity = String(e);
    title.style.filter = `blur(${(1 - e) * 12}px)`;
    title.style.transform = `translateY(${(1 - enter) * 40 - (1 - exit) * 30}px)`;
    note.style.opacity = String(e);
    note.style.transform = `translateY(${(1 - enter) * 24 - (1 - exit) * 18}px)`;
    title.style.visibility = note.style.visibility = vis > 0.001 ? 'visible' : 'hidden';
  }

  function update(p: number) {
    const i = Math.min(ORDER.length - 1, Math.floor(p / SEG));
    const id = ORDER[i];
    const local = (p - i * SEG) / SEG;
    activate(id);
    for (let k = 0; k < ORDER.length; k++) {
      const kid = ORDER[k];
      const klocal = (p - k * SEG) / SEG;
      applyText(kid, gsap.utils.clamp(-0.2, 1.2, klocal));
      const el = sceneEls[kid];
      // scenes are fully visible inside their segment and crossfade over ±FADE outside it
      const f = FADE / SEG;
      const op = gsap.utils.clamp(0, 1, Math.min((klocal + f) / f, (1 - klocal + f) / f));
      el.style.opacity = String(op);
      el.classList.toggle('is-active', k === i);
    }
    scenes[id].setProgress(gsap.utils.clamp(0, 1, local));
    index.textContent = String(i + 1).padStart(2, '0');
  }

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => update(self.progress),
    onToggle(self) {
      inView = self.isActive;
      if (!inView) {
        if (active) scenes[active].setActive(false);
        const was = active;
        active = null;
        if (was) activate(null);
      } else if (active) {
        scenes[active].setActive(true);
      } else {
        update(self.progress);
      }
    },
  });
  update(0);
}
