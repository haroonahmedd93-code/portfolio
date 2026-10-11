/**
 * Build-time HTML rendering from `content.ts`.
 * Used by the `renderContent` plugin in vite.config.ts; never shipped to the browser.
 */
import {
  site, hero, manifesto, pillars, projects, heroTiles, about, outro, nav,
  type Project, type Frame, type CaseChapter,
} from '../content';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const lines = (arr: string[], cls = '') =>
  arr.map((l, i) => `<span class="line${cls ? ' ' + cls : ''}" style="--i:${i}">${esc(l)}</span>`).join('');

const paras = (arr: string[], cls = 'copy') => arr.map((p) => `<p class="${cls}">${esc(p)}</p>`).join('\n');

/* ---------------------------------------------------------------- head */

export function renderHead(opts: { title: string; description: string; path: string; image?: string }) {
  const url = site.url + opts.path;
  return `
  <title>${esc(opts.title)}</title>
  <meta name="description" content="${esc(opts.description)}" />
  <meta name="theme-color" content="#000000" />
  <meta name="color-scheme" content="dark" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(opts.title)}" />
  <meta property="og:description" content="${esc(opts.description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${site.url}${opts.image ?? '/media/og.svg'}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="preload" href="/fonts/league-gothic-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/fonts/instrument-sans-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/fonts/mrs-saint-delafield-latin.woff2" as="font" type="font/woff2" crossorigin />`;
}

/* -------------------------------------------------------------- header */

const logo = `
<svg class="logo" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false">
  <path class="logo__ink" d="M9 8c2.5 2 3 10 3 16s-.5 14-3 16M9 24h13M22 8c2.5 2 3 10 3 16s-.5 14-3 16M31 40c.8-6 3-14 6-20 1-2 2-4 1-6-1-1-3 0-4 2 2-1 4 0 5 2 1.5 3 1 8 2 12 .5 3 1 6 0 10" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function renderHeader(mode: 'home' | 'case', current?: { index: string; label: string }) {
  const centre =
    mode === 'home'
      ? `<nav class="nav" aria-label="Sections">
      <ul class="nav__track">
        ${nav
          .map(
            (n, i) =>
              `<li><a class="nav__link${i === 0 ? ' is-active' : ''}" href="#${n.id}"${i === 0 ? ' aria-current="location"' : ''}>${n.label}</a></li>`,
          )
          .join('')}
      </ul>
      <span class="nav__thumb" aria-hidden="true"></span>
    </nav>`
      : `<div class="chapter-pill" aria-live="polite" aria-atomic="true">
      <span class="chapter-pill__num">${current?.index ?? '01'}</span>
      <span class="chapter-pill__label">${esc(current?.label ?? '')}</span>
    </div>`;

  return `
<a class="skip-link" href="#work">Skip to work</a>
<header class="header">
  <a class="header__logo" href="/" aria-label="${esc(site.name)} — home">${logo}</a>
  ${centre}
  <a class="header__email link" href="mailto:${site.email}">${site.email}</a>
</header>`;
}

/* ---------------------------------------------------------------- home */

function renderIntro() {
  const tiles = heroTiles
    .map(
      (t, i) =>
        `<li class="wall__tile" style="--i:${i}" data-href="${t.href}"><img src="${t.src}" alt="" width="1200" height="1200" loading="${i < 4 ? 'eager' : 'lazy'}" decoding="async" /></li>`,
    )
    .join('');
  const preload = heroTiles.slice(0, 12).map((t) => `<link rel="preload" as="image" href="${t.src}" />`).join('');
  return `
${preload}
<section id="intro" class="section section--lede" aria-labelledby="intro-title">
  <div class="lede-stage">
    <div class="wall" data-wall>
      <canvas class="wall__gl" data-wall-canvas aria-hidden="true"></canvas>
      <ul class="wall__grid" data-wall-fallback aria-hidden="true">${tiles}</ul>
      <div class="wall__vignette" aria-hidden="true"></div>
      <div class="wall__fade" data-wall-fade aria-hidden="true"></div>
    </div>
    <div class="lede" data-lede>
      <p class="lede__line" data-lede-line>${esc(hero.lede)}</p>
      <h1 id="intro-title" class="display display--xl lede__title" data-lede-title><span class="lede__title-inner">${esc(hero.title)}</span></h1>
      <p class="lede__script script" data-lede-script>${esc(hero.script)}</p>
    </div>
  </div>
</section>`;
}

function renderManifesto() {
  return `
<section class="section section--manifesto" aria-label="Manifesto">
  <p class="manifesto lead">${lines(manifesto.lines)}</p>
</section>`;
}

function renderApproach() {
  const items = pillars
    .map(
      (p) => `
    <article class="pillar pillar--${p.id}" id="pillar-${p.id}" aria-labelledby="pillar-${p.id}-title">
      <div class="pillar__scene" role="img" aria-label="${esc(p.scene)}">
        <span class="pillar__scene-label">${esc(p.scene)}</span>
      </div>
      <div class="pillar__copy">
        <span class="micro pillar__index">${p.index}</span>
        <h3 id="pillar-${p.id}-title" class="display display--l pillar__title">${esc(p.title)}</h3>
        <p class="lead pillar__body">${esc(p.body)}</p>
      </div>
    </article>`,
    )
    .join('');
  return `
<section id="approach" class="section section--focus" aria-labelledby="approach-title">
  <h2 id="approach-title" class="visually-hidden">Approach</h2>
  <div class="approach__stage">${items}</div>
</section>`;
}

function frame(f: Frame, w: number, h: number, extra = '') {
  return `<figure class="frame frame--${f.kind}${extra}"><img src="${f.src}" alt="${esc(f.alt)}" width="${w}" height="${h}" loading="lazy" decoding="async" /></figure>`;
}

const frameSize = (k: Frame['kind']) => (k === 'phone' ? [390, 844] : k === 'tablet' ? [1024, 768] : [1600, 1000]);

function renderWorkItem(p: Project, i: number) {
  const slides = p.frames
    .map((f, j) => {
      const [w, h] = frameSize(f.kind);
      return `<li class="carousel__slide" data-index="${j}">${frame(f, w, h)}</li>`;
    })
    .join('');
  const dots = p.frames
    .map(
      (_, j) =>
        `<button class="carousel__dot${j === 0 ? ' is-active' : ''}" type="button" aria-label="Slide ${j + 1} of ${p.frames.length}"${j === 0 ? ' aria-current="true"' : ''}></button>`,
    )
    .join('');
  return `
  <article class="work__item" id="work-${p.slug}" aria-labelledby="work-${p.slug}-title" style="--i:${i}">
    <header class="work__head">
      <p class="work__meta micro">
        ${p.tag ? `<span class="tag">${p.tag}</span>` : ''}
        <time datetime="${p.year}">${p.year}</time>
        <span class="work__company">${esc(p.company)}</span>
      </p>
      <h3 id="work-${p.slug}-title" class="display display--l work__title">${lines(p.titleLines)}</h3>
      <p class="work__pitch body">${esc(p.pitch)}</p>
      <a class="btn" href="/cases/${p.slug}/"><span class="btn__label">View Case Study</span></a>
    </header>
    <div class="carousel" data-carousel>
      <ul class="carousel__track" aria-label="${esc(p.title)} screens">${slides}</ul>
      <div class="carousel__dots" aria-hidden="true">${dots}</div>
    </div>
  </article>`;
}

function renderWork() {
  return `
<section class="section section--featured" aria-labelledby="featured-title">
  <h2 id="featured-title" class="display display--xl featured__title">${lines(['FEATURED', 'PROJECTS'])}</h2>
</section>
<section id="work" class="section section--work" aria-label="Selected work">
  ${projects.map(renderWorkItem).join('')}
</section>`;
}

function renderAbout() {
  return `
<section id="about" class="section section--about" aria-labelledby="about-title">
  <div class="about__media" aria-hidden="true">
    <img src="${about.portrait.src}" alt="" width="900" height="1200" loading="lazy" decoding="async" />
  </div>
  <div class="about__copy">
    <h2 id="about-title" class="display display--xl about__title">${lines(about.title)}</h2>
    ${paras(about.paragraphs, 'lead about__p')}
    <p class="about__signature script"><span class="visually-hidden">Signed, </span>${esc(about.signature)}</p>
  </div>
</section>`;
}

export function renderOutro(opts: { next?: Project } = {}) {
  const next = opts.next
    ? `<a class="outro__next btn" href="/cases/${opts.next.slug}/"><span class="btn__label">Next: ${esc(opts.next.title)}</span></a>`
    : '';
  return `
<footer id="outro" class="section section--outro" aria-labelledby="outro-title">
  <div class="outro__glow" aria-hidden="true"></div>
  <h2 id="outro-title" class="display display--xl outro__title">${lines(outro.title)}</h2>
  <ul class="outro__links" aria-label="Contact">
    <li><a class="link link--roll" href="${site.linkedin}" rel="me noopener" target="_blank">LinkedIn</a></li>
    <li><a class="link link--roll" href="mailto:${site.email}" data-copy-email>${site.email}</a></li>
  </ul>
  ${next}
  <p class="outro__copyright micro">© ${site.year} ${esc(site.name)}</p>
</footer>`;
}

export function renderHome() {
  return `
${renderHeader('home')}
<main id="main">
  ${renderIntro()}
  ${renderManifesto()}
  ${renderApproach()}
  ${renderWork()}
  ${renderAbout()}
</main>
${renderOutro()}`;
}

/* ---------------------------------------------------------------- case */

function renderChapter(c: CaseChapter, i: number, total: number) {
  const index = String(i + 1).padStart(2, '0');
  const blocks = (c.blocks ?? [])
    .map(
      (b) => `
      <div class="band__block">
        <h3 class="band__subtitle">${esc(b.heading)}</h3>
        ${paras(b.paragraphs)}
      </div>`,
    )
    .join('');
  const features = c.features?.length
    ? `<ul class="band__features">${c.features
        .map((f) => {
          const [w, h] = frameSize(f.kind);
          return `<li class="band__feature">${frame(f, w, h)}</li>`;
        })
        .join('')}</ul>`
    : '';
  const metrics = c.metrics?.length
    ? `<dl class="metrics">${c.metrics
        .map((m) => `<div class="metric"><dd class="metric__value display display--m">${esc(m.value)}</dd><dt class="metric__label micro">${esc(m.label)}</dt></div>`)
        .join('')}</dl>`
    : '';
  return `
  <section class="band band--${c.id}" id="${c.id}" data-chapter="${index}" data-chapter-label="${esc(c.label)}" aria-labelledby="${c.id}-title" style="--i:${i}" data-total="${total}">
    <p class="band__label micro"><span>${index}</span> ${esc(c.label)}</p>
    <h2 id="${c.id}-title" class="display display--m band__title">${esc(c.title)}</h2>
    <div class="band__copy">${paras(c.paragraphs)}${blocks}</div>
    ${features}
    ${metrics}
  </section>`;
}

export function renderCase(p: Project) {
  const idx = projects.findIndex((x) => x.slug === p.slug);
  const next = projects[(idx + 1) % projects.length];
  const first = p.case.chapters[0];
  const [hw, hh] = frameSize(p.case.hero.kind);
  return `
${renderHeader('case', { index: '01', label: first.label })}
<main id="main" class="case">
  <section class="case-head" aria-labelledby="case-title">
    <p class="micro case-head__meta-line"><time datetime="${p.year}">${p.year}</time> · ${esc(p.company)}</p>
    <h1 id="case-title" class="display display--xl case-head__title">${lines(p.titleLines)}</h1>
    <p class="case-head__intro lead">${esc(p.case.intro)}</p>
    <dl class="case-head__meta">
      <div><dt class="micro">My role</dt><dd>${esc(p.case.role)}</dd></div>
      <div><dt class="micro">Timeline</dt><dd>${esc(p.case.timeline)}</dd></div>
      <div><dt class="micro">Team</dt><dd>${esc(p.case.team)}</dd></div>
    </dl>
    <figure class="case-head__hero fold">
      <img src="${p.case.hero.src}" alt="${esc(p.case.hero.alt)}" width="${hw}" height="${hh}" decoding="async" fetchpriority="high" />
    </figure>
  </section>
  <div class="bands" id="work">
    ${p.case.chapters.map((c, i) => renderChapter(c, i, p.case.chapters.length)).join('')}
    ${p.case.link ? `<p class="case__visit"><a class="btn" href="${p.case.link.href}" rel="noopener" target="_blank"><span class="btn__label">${esc(p.case.link.label)} ↗</span></a></p>` : ''}
  </div>
</main>
${renderOutro({ next })}`;
}

export function caseMeta(p: Project) {
  return {
    title: `${p.title} — ${site.name}`,
    description: p.pitch,
    path: `/cases/${p.slug}/`,
  };
}

export function homeMeta() {
  return {
    title: `${site.name} — ${site.role}, ${site.location}`,
    description: site.description,
    path: '/',
  };
}
