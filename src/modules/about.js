import { getContent } from './content.js';
import { initRevealAnimations } from './revealAnimations.js';

export async function renderAbout() {
  const bioEl = document.getElementById('about-bio');
  const portraitEl = document.getElementById('about-portrait');
  const skillsEl = document.getElementById('about-skills');
  const timelineEl = document.getElementById('about-timeline');
  const resumeEl = document.getElementById('about-resume');
  if (!bioEl && !skillsEl && !timelineEl) return;

  const { about, site } = await getContent();

  if (portraitEl && about.portrait) {
    portraitEl.src = about.portrait;
    portraitEl.alt = `Portrait of ${site.name || '[YOUR_NAME]'}`;
  }

  if (bioEl) {
    bioEl.innerHTML = (about.body || '')
      .split(/\n{2,}/)
      .map((p) => `<p>${p}</p>`)
      .join('');
  }

  if (skillsEl) {
    skillsEl.innerHTML = (about.skills || []).map((s) => `<span class="tag">${s}</span>`).join('');
  }

  if (timelineEl) {
    timelineEl.innerHTML = (about.experience || [])
      .map(
        (e) => `
        <div class="timeline-item" data-reveal data-reveal-group>
          <div class="section-eyebrow">${e.period}</div>
          <div>
            <h3>${e.role}</h3>
            <p class="project-card__meta">${e.org}</p>
            <p>${e.description}</p>
          </div>
        </div>
      `
      )
      .join('');
  }

  if (resumeEl && site.resumeUrl) {
    resumeEl.href = site.resumeUrl;
  }

  initRevealAnimations(document.getElementById('about-root') || document);
}
