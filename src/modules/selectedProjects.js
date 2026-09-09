import { getContent } from './content.js';
import { initRevealAnimations } from './revealAnimations.js';

export async function renderSelectedProjects() {
  const el = document.getElementById('selected-projects');
  if (!el) return;

  const { projects } = await getContent();
  const featured = projects.filter((p) => p.featured);

  el.innerHTML = featured
    .map(
      (p) => `
      <a class="project-card" href="/projects/project.html?slug=${encodeURIComponent(p.slug)}" data-reveal data-reveal-group>
        <div class="project-card__media">
          <img src="${p.cover}" alt="" loading="lazy" width="1600" height="1000" />
        </div>
        <div class="project-card__body">
          <h3 class="project-card__title">${p.title}</h3>
          <p class="project-card__meta">${p.role} · ${p.year}</p>
        </div>
      </a>
    `
    )
    .join('');

  initRevealAnimations(el);
}
