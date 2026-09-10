import { getContent } from './content.js';
import { initRevealAnimations } from './revealAnimations.js';
import { gradientClass } from './gradient.js';

export async function renderSelectedProjects() {
  const el = document.getElementById('selected-projects');
  if (!el) return;

  const { projects } = await getContent();
  const featured = projects.filter((p) => p.featured);

  el.innerHTML = featured
    .map(
      (p, i) => `
      <a class="project-card" href="/projects/project.html?slug=${encodeURIComponent(p.slug)}" data-reveal data-reveal-group>
        <div class="project-card__body">
          <h3 class="project-card__title">${p.title}</h3>
          <p class="project-card__meta">${p.role} · ${p.year}</p>
        </div>
        <div class="project-card__media ${gradientClass(p.slug, i)}" aria-hidden="true"></div>
      </a>
    `
    )
    .join('');

  initRevealAnimations(el);
}
