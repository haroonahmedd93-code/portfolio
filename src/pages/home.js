import '../main.js';
import { getContent } from '../modules/content.js';
import { shouldRunHeroScene } from '../three/capability.js';
import { initGalleryList } from '../modules/galleryList.js';
import { navigateWithFade } from '../modules/pageTransition.js';

const $ = (id) => document.getElementById(id);

async function renderChrome() {
  const { site } = await getContent();
  const name = site.name || '[YOUR_NAME]';
  const parts = name.split(' ');
  $('hero-name').innerHTML = `${parts[0]}<br />${parts.slice(1).join(' ')}`;
  $('hero-role').textContent = site.role || '[YOUR_ROLE]';
  $('hero-email-link').href = `mailto:${site.email || '[YOUR_EMAIL]'}`;
  document.title = `${name} — ${site.role || '[YOUR_ROLE]'}`;

  const clock = $('stage-clock');
  const phase = $('stage-phase');
  const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Dubai' });
  const hourFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Dubai' });
  const update = () => {
    const now = new Date();
    clock.textContent = `DXB, ${fmt.format(now)}`;
    const h = Number(hourFmt.format(now)) % 24;
    phase.textContent = h < 6 ? 'Late night' : h < 10 ? 'Starting the day' : h < 14 ? 'Deep in work' : h < 19 ? 'Afternoon session' : 'Winding down';
  };
  update();
  setInterval(update, 30000);
}

async function bootStage() {
  await renderChrome();
  const canvas = $('hero-canvas');
  const fallback = $('hero-fallback');
  const { projects } = await getContent();

  const labels = $('stage-labels');
  const titleEl = $('focus-title');
  const catEl = $('focus-cat');
  const viewEl = $('focus-view');
  const root = document.documentElement;

  initGalleryList({
    projects,
    canvasWrap: $('hero-canvas-wrap'),
    listEl: $('gallery-list'),
    sphereBtn: $('gallery-sphere-btn'),
    listBtn: $('gallery-list-btn'),
    labelsEl: labels,
  });

  if (!shouldRunHeroScene()) {
    fallback.hidden = false;
    return;
  }

  try {
    const { createHeroScene } = await import('../three/heroScene.js');
    let current = null;
    const scene = createHeroScene(canvas, projects, {
      onSelect: (slug) => navigateWithFade(`/projects/project.html?slug=${encodeURIComponent(slug)}`),
      onFocus: (project, tint, y, positionOnly) => {
        if (y != null) labels.style.setProperty('--y', `${(y * 100).toFixed(2)}%`);
        if (positionOnly) return;
        if (project !== current) {
          current = project;
          labels.classList.toggle('is-on', !!project);
          if (project) {
            titleEl.textContent = project.title;
            catEl.textContent = (project.tags && project.tags[0]) || project.role || '';
          }
          root.style.setProperty('--stage-tint', tint || 'transparent');
        }
      },
      onHover: (project) => viewEl.classList.toggle('is-on', !!project),
    });
    window.addEventListener('beforeunload', () => scene.dispose());
  } catch (err) {
    console.warn('Hero scene failed to initialize, falling back.', err);
    fallback.hidden = false;
  }
}

bootStage();
