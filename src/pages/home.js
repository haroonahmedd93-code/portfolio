import '../main.js';
import { renderSelectedProjects } from '../modules/selectedProjects.js';
import { getContent } from '../modules/content.js';
import { initHeroIntro } from '../modules/revealAnimations.js';
import { shouldRunHeroScene, prefersReducedMotion } from '../three/capability.js';

async function renderHeroText() {
  const { site } = await getContent();
  const nameEl = document.getElementById('hero-name');
  const roleEl = document.getElementById('hero-role');
  const statementEl = document.getElementById('hero-statement');
  const emailLink = document.getElementById('hero-email-link');
  if (nameEl) nameEl.textContent = site.name || '[YOUR_NAME]';
  if (roleEl) roleEl.textContent = site.role || '[YOUR_ROLE]';
  if (statementEl) statementEl.textContent = site.statement || '';
  if (emailLink) emailLink.href = `mailto:${site.email || '[YOUR_EMAIL]'}`;

  const servicesEl = document.getElementById('services-grid');
  if (servicesEl && site.services) {
    servicesEl.innerHTML = site.services
      .map(
        (s) => `
        <div class="service-card" data-reveal data-reveal-group>
          <h3>${s.title}</h3>
          <p>${s.description}</p>
        </div>
      `
      )
      .join('');
  }
  document.title = `${site.name || '[YOUR_NAME]'} — ${site.role || '[YOUR_ROLE]'}`;
}

async function bootHero() {
  await renderHeroText();
  initHeroIntro();

  const canvas = document.getElementById('hero-canvas');
  const fallback = document.getElementById('hero-fallback');
  if (!canvas) return;

  if (!shouldRunHeroScene()) {
    if (fallback) fallback.hidden = false;
    return;
  }

  try {
    const { createHeroScene } = await import('../three/heroScene.js');
    const scene = createHeroScene(canvas);
    window.addEventListener('beforeunload', () => scene.dispose());
  } catch (err) {
    console.warn('Hero scene failed to initialize, falling back.', err);
    if (fallback) fallback.hidden = false;
  }

  // If the user changes their OS motion preference mid-session, don't fight it.
  window
    .matchMedia('(prefers-reduced-motion: reduce)')
    .addEventListener?.('change', (e) => {
      if (e.matches && fallback) fallback.hidden = false;
    });
}

bootHero();
renderSelectedProjects();
