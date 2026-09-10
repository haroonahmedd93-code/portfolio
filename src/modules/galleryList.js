import { navigateWithFade } from './pageTransition.js';

// Toggle between the 3D sphere gallery and a flat list of the same projects.
export function initGalleryList({ projects, canvasWrap, listEl, sphereBtn, listBtn }) {
  if (!listEl) return;

  listEl.innerHTML = projects
    .map(
      (p) => `
      <a class="gallery-list__row" href="/projects/project.html?slug=${encodeURIComponent(p.slug)}" data-slug="${p.slug}">
        <span class="gallery-list__title">${p.title}</span>
        <span class="gallery-list__meta">${p.role} · ${p.year}</span>
      </a>`
    )
    .join('');

  listEl.addEventListener('click', (e) => {
    const row = e.target.closest('a[data-slug]');
    if (!row) return;
    e.preventDefault();
    navigateWithFade(row.href);
  });

  function showList() {
    listEl.hidden = false;
    canvasWrap.hidden = true;
    listBtn?.setAttribute('aria-pressed', 'true');
    sphereBtn?.setAttribute('aria-pressed', 'false');
  }

  function showSphere() {
    listEl.hidden = true;
    canvasWrap.hidden = false;
    listBtn?.setAttribute('aria-pressed', 'false');
    sphereBtn?.setAttribute('aria-pressed', 'true');
  }

  listBtn?.addEventListener('click', showList);
  sphereBtn?.addEventListener('click', showSphere);
}
