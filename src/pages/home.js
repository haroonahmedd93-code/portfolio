import '../main.js';
import Lenis from 'lenis';
import gsap from 'gsap';
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

/**
 * Scroll model (matches the reference): the page is a tall scroll, one project
 * per ~0.95 viewport heights, smoothed by Lenis (lerp 0.08, infinite) and ticked
 * by GSAP. Drag on the canvas is translated to scroll with a velocity buffer so a
 * flick coasts; wheel/trackpad/keys go through Lenis natively.
 */
function initScrollModel({ scene, projects, canvas, stage }) {
  const STEP = () => Math.round(window.innerHeight * 0.95); // px of scroll per panel
  const total = Math.max(projects.length, 8) * 3; // helix repeats; infinite scroll wraps anyway
  const spacer = $('stage-scroll');
  const sizeSpacer = () => { spacer.style.height = `${STEP() * total + window.innerHeight}px`; };
  sizeSpacer();
  window.addEventListener('resize', sizeSpacer);

  const lenis = new Lenis({ lerp: 0.08, wheelMultiplier: 1, smoothWheel: true, infinite: true });
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  window.lenis = lenis;

  lenis.on('scroll', ({ scroll }) => scene.setScroll(scroll / STEP()));

  // Arrow keys nudge like the reference.
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') lenis.scrollTo(lenis.scroll - 100, { duration: 0.2 });
    if (e.key === 'ArrowDown') lenis.scrollTo(lenis.scroll + 100, { duration: 0.2 });
  });

  // Drag-to-scroll with a velocity sample buffer (last ~100ms) for the flick.
  const drag = { on: false, startY: 0, startX: 0, startScroll: 0, dist: 0, samples: [] };
  const onDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    drag.on = true; drag.dist = 0; drag.samples = [];
    drag.startY = e.clientY; drag.startX = e.clientX; drag.startScroll = lenis.targetScroll;
    canvas.setPointerCapture?.(e.pointerId);
    stage.classList.add('is-dragging');
  };
  const onMove = (e) => {
    if (!drag.on) return;
    const dy = e.clientY - drag.startY;
    const dx = e.clientX - drag.startX;
    drag.dist = Math.abs(dy) + Math.abs(dx);
    // Vertical drag scrolls 1:1; horizontal drag also turns the screw (drag left = advance).
    const target = drag.startScroll - dy - dx * 0.8;
    lenis.scrollTo(target, { immediate: false, lock: false, force: true });
    drag.samples.push({ t: performance.now(), v: target });
    if (drag.samples.length > 8) drag.samples.shift();
  };
  const onUp = (e) => {
    if (!drag.on) return;
    drag.on = false;
    canvas.releasePointerCapture?.(e.pointerId);
    stage.classList.remove('is-dragging');
    if (drag.dist < 6) {
      const project = scene.hitFocused(e.clientX, e.clientY);
      if (project) select(project);
      return;
    }
    // Flick: velocity over the last samples → coast, eased out like Lenis' own scrollTo.
    const s = drag.samples;
    if (s.length >= 2) {
      const a = s[0]; const b = s[s.length - 1];
      const dt = Math.max(16, b.t - a.t);
      const vel = (b.v - a.v) / dt; // px per ms
      if (Math.abs(vel) > 0.15) {
        lenis.scrollTo(b.v + vel * 380, { duration: 1.2, easing: (x) => 1 - Math.pow(2, -10 * x) });
        return;
      }
    }
    snapSoon();
  };
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  // Soft settle onto the nearest panel once motion has died.
  let snapTimer = null;
  function snapSoon() {
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      if (drag.on) return;
      const step = STEP();
      const nearest = Math.round(lenis.targetScroll / step) * step;
      if (Math.abs(nearest - lenis.targetScroll) > 1) lenis.scrollTo(nearest, { duration: 0.9 });
    }, 160);
  }
  lenis.on('scroll', ({ velocity }) => { if (!drag.on && Math.abs(velocity) < 0.3) snapSoon(); });

  let exiting = false;
  function select(project) {
    if (exiting) return;
    exiting = true;
    lenis.stop();
    document.body.classList.add('is-leaving');
    scene.exit(() => navigateWithFade(`/projects/project.html?slug=${encodeURIComponent(project.slug)}`, 250));
  }

  return { lenis, select };
}

async function bootStage() {
  await renderChrome();
  const canvas = $('hero-canvas');
  const fallback = $('hero-fallback');
  const stage = $('main');
  const { projects } = await getContent();

  const band = $('stage-labels');
  const titleEl = $('focus-title');
  const catEl = $('focus-cat');
  const yearEl = $('focus-year');
  const idxEl = $('focus-idx');
  const cursor = $('stage-cursor');
  const bgLayers = [$('stage-bg-a'), $('stage-bg-b')];
  let bgFlip = 0;

  initGalleryList({
    projects,
    canvasWrap: $('hero-canvas-wrap'),
    listEl: $('gallery-list'),
    sphereBtn: $('gallery-sphere-btn'),
    listBtn: $('gallery-list-btn'),
    labelsEl: band,
  });

  if (!shouldRunHeroScene()) {
    fallback.hidden = false;
    return;
  }

  try {
    const { createHeroScene } = await import('../three/heroScene.js');
    let current = null;
    const scene = createHeroScene(canvas, projects, {
      onFocus: (project, data) => {
        if (project === current) return;
        current = project;
        band.classList.toggle('is-on', !!project);
        if (project) {
          titleEl.textContent = project.title;
          catEl.textContent = (project.tags && project.tags[0]) || project.role || '';
          yearEl.textContent = project.year || '';
          idxEl.textContent = String(projects.indexOf(project) + 1).padStart(2, '0');
          // Backdrop: two cover layers crossfaded under a blur(100px) overlay.
          bgFlip = 1 - bgFlip;
          bgLayers[bgFlip].style.backgroundImage = `url(${data.thumb})`;
          gsap.to(bgLayers[bgFlip], { opacity: 1, duration: 0.8, ease: 'power2.out' });
          gsap.to(bgLayers[1 - bgFlip], { opacity: 0, duration: 0.8, ease: 'power2.out' });
        }
      },
      // Hovering the focused panel: band gets its blurred strip, native cursor is
      // replaced by a "[VIEW PROJECT]" label that follows the pointer.
      onHover: (project) => {
        const on = !!project;
        band.classList.toggle('is-hovered', on);
        canvas.style.cursor = on ? 'none' : 'grab';
        gsap.to(cursor, { opacity: on ? 1 : 0, duration: 0.3, ease: 'power2.out' });
      },
    });
    window.addEventListener('pointermove', (e) => {
      cursor.style.transform = `translate3d(${e.clientX + 14}px, ${e.clientY + 8}px, 0)`;
    }, { passive: true });

    const model = initScrollModel({ scene, projects, canvas, stage });
    window.addEventListener('beforeunload', () => { model.lenis.destroy(); scene.dispose(); });
    gsap.to(stage, { opacity: 1, duration: 0.8, ease: 'power2.out' });
  } catch (err) {
    console.warn('Hero scene failed to initialize, falling back.', err);
    fallback.hidden = false;
  }
}

bootStage();
