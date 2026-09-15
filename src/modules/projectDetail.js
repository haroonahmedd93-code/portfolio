import { getContent } from './content.js';
import { gradientClass } from './gradient.js';
import { navigateWithFade } from './pageTransition.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const paras = (t) => esc(t).split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${p.replace(/\n/g, '<br />')}</p>`).join('');
const cat = (p) => (p.tags && p.tags[0]) || p.role || '';
const placeholder = (src) => !src || /placeholder|^#?$/.test(src);

function field(label, html) {
  return html ? `<div class="case__field"><span class="case__label">${label}</span><div class="case__value">${html}</div></div>` : '';
}

function mediaMarkup(project) {
  const imgs = project.gallery && project.gallery.length ? project.gallery : [null, null];
  return imgs
    .map((src, i) =>
      placeholder(src)
        ? `<div class="case__media ${gradientClass(`${project.slug}-${i}`, i)}" aria-hidden="true"></div>`
        : `<img class="case__media" src="${esc(src)}" alt="${esc(project.title)} — ${i + 1}" loading="lazy" />`
    )
    .join('');
}

export async function initProjectDetail() {
  const root = document.getElementById('project-detail');
  if (!root) return;
  const slug = new URLSearchParams(window.location.search).get('slug');
  const { projects, site } = await getContent();
  const index = projects.findIndex((p) => p.slug === slug);
  const project = index >= 0 ? projects[index] : projects[0];
  if (!project) { root.innerHTML = '<p>Project not found.</p>'; return; }

  document.title = `${project.title} — ${site.name || ''}`;
  document.getElementById('case-title').textContent = project.title;
  document.getElementById('case-cat').textContent = cat(project);
  const email = document.getElementById('case-email');
  if (email && site.email) email.href = `mailto:${site.email}`;
  document.getElementById('case-close').addEventListener('click', (e) => { e.preventDefault(); navigateWithFade('/'); });

  const next = projects[(index + 1) % projects.length];
  const links = (project.links || []).filter((l) => l.url && l.url !== '#');

  root.innerHTML = `
    <section class="case__meta">
      ${field('Overview', paras(project.summary))}
      ${links.length ? `<div class="case__field case__links">${links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">[${esc(l.label)}]</a>`).join('')}</div>` : ''}
      ${field('Role', esc(project.role))}
      ${field('Year', esc(project.year))}
      ${field('Tools', esc((project.tools || []).join(', ')))}
      ${field('Tags', esc((project.tags || []).join(', ')))}
    </section>

    <section class="case__gallery">${mediaMarkup(project)}</section>

    <section class="case__study">
      ${field('Challenge', paras(project.challenge))}
      ${field('Solution', paras(project.solution))}
      ${project.outcomes && project.outcomes.length ? field('Outcomes', `<ul class="case__list">${project.outcomes.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>`) : ''}
      ${project.body ? field('Process', paras(project.body)) : ''}
    </section>

    ${next && next !== project ? `<a class="case__next" href="/projects/project.html?slug=${encodeURIComponent(next.slug)}" data-next>
      <span class="case__label">Next project</span>
      <span class="case__next-title">${esc(next.title)}</span>
      <span class="case__label">${esc(cat(next))} · ${esc(next.year || '')}</span>
    </a>` : ''}
  `;
  root.querySelector('[data-next]')?.addEventListener('click', (e) => { e.preventDefault(); navigateWithFade(e.currentTarget.href); });
}
