import { getContent } from './content.js';
import { initRevealAnimations } from './revealAnimations.js';

function galleryMarkup(images) {
  return (images || [])
    .map(
      (src, i) =>
        `<img src="${src}" alt="" loading="${i === 0 ? 'eager' : 'lazy'}" width="1600" height="1000" data-reveal />`
    )
    .join('');
}

function paginationLink(project, label) {
  if (!project) return '<span></span>';
  return `<a href="/projects/project.html?slug=${encodeURIComponent(project.slug)}">
    <span class="section-eyebrow">${label}</span><br />${project.title}
  </a>`;
}

export async function initProjectDetail() {
  const root = document.getElementById('project-detail');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');
  const { projects } = await getContent();
  const index = projects.findIndex((p) => p.slug === slug);
  const project = index >= 0 ? projects[index] : projects[0];

  if (!project) {
    root.innerHTML = '<p>Project not found.</p>';
    return;
  }

  document.title = `${project.title} — Project`;

  const prev = projects[index - 1] || null;
  const next = projects[index + 1] || projects[0] || null;

  root.innerHTML = `
    <header class="detail-header" data-reveal>
      <p class="section-eyebrow">${(project.tags || []).join(' · ')}</p>
      <h1>${project.title}</h1>
      <p class="hero__statement" style="max-width:42rem;">${project.summary}</p>
      <div class="detail-meta">
        <span><strong>Role</strong><br />${project.role}</span>
        <span><strong>Year</strong><br />${project.year}</span>
        <span><strong>Tools</strong><br />${(project.tools || []).join(', ')}</span>
      </div>
    </header>

    <div class="detail-gallery">${galleryMarkup(project.gallery)}</div>

    <div class="detail-body">
      <section data-reveal>
        <h2>Challenge</h2>
        <p>${project.challenge || ''}</p>
      </section>
      <section data-reveal>
        <h2>Solution</h2>
        <p>${project.solution || ''}</p>
      </section>
      ${
        project.outcomes && project.outcomes.length
          ? `<section data-reveal>
              <h2>Outcomes</h2>
              <ul class="outcome-list">${project.outcomes.map((o) => `<li>${o}</li>`).join('')}</ul>
            </section>`
          : ''
      }
      ${
        project.links && project.links.length
          ? `<section data-reveal>
              <h2>Links</h2>
              <p>${project.links.map((l) => `<a class="btn" href="${l.url}">${l.label}</a>`).join(' ')}</p>
            </section>`
          : ''
      }
    </div>

    <nav class="detail-pagination" aria-label="Project pagination">
      ${paginationLink(prev, 'Previous')}
      ${paginationLink(next, 'Next')}
    </nav>
  `;

  initRevealAnimations(root);
}
