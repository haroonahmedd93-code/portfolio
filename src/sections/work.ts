/**
 * Works (W1–W8): warp titles, meta rise, highlight pitch, carousels.
 */
import { highlight, riseIn } from '../core/reveal';
import { initWarpTitles } from '../ui/warp-title';
import { initCarousels } from '../ui/carousel';

export function initWork() {
  const work = document.querySelector<HTMLElement>('#work');
  if (!work) return;
  initWarpTitles();
  for (const meta of work.querySelectorAll<HTMLElement>('[data-reveal-meta]')) riseIn(Array.from(meta.children) as Element[], { trigger: meta });
  for (const pitch of work.querySelectorAll<HTMLElement>('[data-highlight]')) highlight(pitch);
  initCarousels();
}
