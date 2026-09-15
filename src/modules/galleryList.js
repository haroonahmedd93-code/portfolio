import { navigateWithFade } from './pageTransition.js';

const cat = (p) => (p.tags && p.tags[0]) || p.role || '';

// Toggle between the 3D sphere gallery and a numbered list of the same projects.
export function initGalleryList({ projects, canvasWrap, listEl, sphereBtn, listBtn, labelsEl }) {
  if (!listEl) return;

  listEl.innerHTML = `<div class="gallery-list__inner">${projects
    .map(
      (p, i) => `
      <a class="gallery-list__row" href="/projects/project.html?slug=${encodeURIComponent(p.slug)}" data-slug="${p.slug}">
        <span class="gallery-list__idx">${String(i + 1).padStart(2, '0')}</span>
        <span class="gallery-list__body">
          <span class="gallery-list__title">${p.title}</span>
          <span class="gallery-list__cat">${cat(p)}</span>
        </span>
        <span class="gallery-list__stack">${(p.tools || p.tags || []).join(' · ')}</span>
        <span class="gallery-list__year">${p.year || ''}</span>
      </a>`
    )
    .join('')}</div>`;

  listEl.addEventListener('click', (e) => {
    const row = e.target.closest('a[data-slug]');
    if (!row) return;
    e.preventDefault();
    navigateWithFade(row.href);
  });

  const mark = (btn, on) => {
    btn?.setAttribute('aria-pressed', on ? 'true' : 'false');
    const i = btn?.querySelector('i');
    if (i) i.textContent = on ? '[·]' : '[ ]';
  };

  function showList() {
    listEl.hidden = false;
    canvasWrap.hidden = true;
    if (labelsEl) labelsEl.hidden = true;
    mark(listBtn, true); mark(sphereBtn, false);
  }
  function showSphere() {
    listEl.hidden = true;
    canvasWrap.hidden = false;
    if (labelsEl) labelsEl.hidden = false;
    mark(listBtn, false); mark(sphereBtn, true);
  }

  listBtn?.addEventListener('click', showList);
  sphereBtn?.addEventListener('click', showSphere);
}
