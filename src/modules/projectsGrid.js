import { getContent } from './content.js';
import { initRevealAnimations } from './revealAnimations.js';

function cardMarkup(project) {
  return `
    <a class="project-card" href="/projects/project.html?slug=${encodeURIComponent(project.slug)}" data-reveal data-reveal-group>
      <div class="project-card__media">
        <img src="${project.cover}" alt="" loading="lazy" width="1600" height="1000" />
      </div>
      <div class="project-card__body">
        <h3 class="project-card__title">${project.title}</h3>
        <p class="project-card__meta">${project.role} · ${project.year}</p>
        <div class="tag-list">
          ${(project.tags || []).map((t) => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>
    </a>
  `;
}

export async function initProjectsGrid() {
  const grid = document.getElementById('project-grid');
  const filterBar = document.getElementById('filter-bar');
  if (!grid) return;

  const { projects } = await getContent();
  const tags = ['All', ...new Set(projects.flatMap((p) => p.tags || []))];
  let active = 'All';

  function render() {
    const list = active === 'All' ? projects : projects.filter((p) => (p.tags || []).includes(active));
    grid.innerHTML = list.map(cardMarkup).join('') || `<p>No projects match this filter yet.</p>`;
    initRevealAnimations(grid);
  }

  if (filterBar) {
    filterBar.innerHTML = tags
      .map(
        (tag) =>
          `<button class="filter-chip" type="button" data-tag="${tag}" aria-pressed="${tag === active}">${tag}</button>`
      )
      .join('');

    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-tag]');
      if (!btn) return;
      active = btn.dataset.tag;
      filterBar.querySelectorAll('button[data-tag]').forEach((b) => {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      render();
    });
  }

  render();
}
