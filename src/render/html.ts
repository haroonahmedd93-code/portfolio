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

const frameSize = (k: Frame['kind']) => (k === 'phone' ? [390, 844] : k === 'tablet' ? [1024, 768] : [1053, 569]);

function frame(f: Frame, extra = '', attrs = '', eager = false) {
  const [w, h] = frameSize(f.kind);
  return `<figure class="frame frame--${f.kind}${extra}"${attrs}><img src="${f.src}" alt="${esc(f.alt)}" width="${w}" height="${h}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" /></figure>`;
}

/* ---------------------------------------------------------------- head */

export function renderHead(opts: { title: string; description: string; path: string; image?: string }) {
  const url = site.url + opts.path;
  return `
  <title>${esc(opts.title)}</title>
  <meta name="description" content="${esc(opts.description)}" />
  <meta name="theme-color" content="#000000" />
  <meta name="color-scheme" content="dark" />
  <meta name="view-transition" content="same-origin" />
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

export function renderHeader(mode: 'home' | 'case', current?: { index: string; label: string }) {
  const centre =
    mode === 'home'
      ? `<nav class="nav" aria-label="Sections">
      <ul class="nav__track">
        ${nav
          .map(
            (n, i) =>
              `<li><a class="nav__link${i === 0 ? ' is-active' : ''}" href="#${n.id}" data-nav="${n.id}"${i === 0 ? ' aria-current="location"' : ''}>${n.label}</a></li>`,
          )
          .join('')}
        <span class="nav__thumb" data-nav-thumb aria-hidden="true"></span>
      </ul>
    </nav>`
      : `<div class="chapter-pill" data-chapter-pill aria-live="polite" aria-atomic="true">
      <span class="chapter-pill__num" data-chapter-num>${current?.index ?? '01'}</span>
      <span class="chapter-pill__label" data-chapter-label><span>${esc(current?.label ?? '')}</span></span>
    </div>`;

  return `
<a class="skip-link" href="#work">Skip to work</a>
<header class="header" data-header>
  <a class="header__logo" href="/" aria-label="${esc(site.name)} — home"><span class="logo script" aria-hidden="true"><span class="logo__ink" data-logo-ink>${esc(site.shortName)}</span></span></a>
  ${centre}
  <a class="header__email link" href="mailto:${site.email}" data-copy-email>${site.email}</a>
</header>`;
}

/* ---------------------------------------------------------------- home */

function renderIntro() {
  const tiles = heroTiles
    .map(
      (t, i) =>
        `<li class="wall__tile" style="--i:${i}" data-href="${t.href}" data-client="${esc(t.client)}" data-title="${esc(t.title)}" data-tags="${esc(t.tags.join('|'))}" data-year="${t.year}">
  <span class="wall__meta wall__meta--top"><span>${esc(t.client)}</span><span>${esc(t.title)}</span></span>
  <img src="${t.src}" alt="" width="1200" height="1200" loading="${i < 4 ? 'eager' : 'lazy'}" decoding="async" />
  <span class="wall__meta wall__meta--bottom"><span class="wall__tags">${t.tags.map((g) => `<span>${esc(g)}</span>`).join('')}</span><span>${t.year}</span></span>
</li>`,
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
      <h1 id="intro-title" class="display lede__title" data-lede-title><span class="lede__title-inner">${esc(hero.title)}</span></h1>
      <p class="lede__script script" data-lede-script>${esc(hero.script)}</p>
    </div>
  </div>
</section>`;
}

function renderManifesto() {
  return `
<section class="section section--manifesto" aria-label="Manifesto">
  <p class="manifesto" data-reveal-lines>${lines(manifesto.lines)}</p>
</section>`;
}

function renderApproach() {
  const stage = `
  <div class="approach__stage" data-approach-stage aria-hidden="true">
    <div class="approach__scenes">
      ${pillars.map((p) => `<div class="scene scene--${p.id}" data-scene="${p.id}"><canvas data-scene-canvas></canvas></div>`).join('')}
    </div>
    <div class="approach__titles">
      ${pillars.map((p) => `<h3 class="display approach__title" data-pillar-title="${p.id}">${esc(p.title)}</h3>`).join('')}
    </div>
    <div class="approach__notes">
      ${pillars.map((p) => `<p class="approach__note" data-pillar-note="${p.id}">${esc(p.body)}</p>`).join('')}
    </div>
    <span class="approach__index" data-approach-index>01</span>
  </div>`;
  const statics = pillars
    .map(
      (p) => `
    <article class="pillar pillar--${p.id}" id="pillar-${p.id}" aria-labelledby="pillar-${p.id}-title">
      <div class="pillar__scene" role="img" aria-label="${esc(p.scene)}"><span class="pillar__scene-label">${esc(p.scene)}</span></div>
      <span class="micro pillar__index">${p.index}</span>
      <h3 id="pillar-${p.id}-title" class="display pillar__title">${esc(p.title)}</h3>
      <p class="pillar__body">${esc(p.body)}</p>
    </article>`,
    )
    .join('');
  return `
<section id="approach" class="section section--focus" aria-labelledby="approach-title" data-approach>
  <h2 id="approach-title" class="visually-hidden">Approach</h2>
  ${stage}
  <div class="approach__static">${statics}</div>
</section>`;
}

function renderWorkItem(p: Project, i: number) {
  const slides = p.frames
    .map((f, j) => `<li class="carousel__slide${j === 0 ? ' is-active' : ''}" data-index="${j}">${frame(f, '', ` data-lightbox="${f.src}"`, true)}</li>`)
    .join('');
  const dots = p.frames
    .map(
      (_, j) =>
        `<button class="carousel__dot${j === 0 ? ' is-active' : ''}" type="button" data-dot="${j}" aria-label="Slide ${j + 1} of ${p.frames.length}"${j === 0 ? ' aria-current="true"' : ''}></button>`,
    )
    .join('');
  return `
  <article class="work__item" id="work-${p.slug}" aria-labelledby="work-${p.slug}-title" style="--i:${i}">
    <div class="work__head">
      <p class="work__meta micro" data-reveal-meta>
        ${p.tag ? `<span class="tag">${p.tag}</span>` : ''}
        <time datetime="${p.year}">${p.year}</time>
        <span class="work__company">${esc(p.company)}</span>
      </p>
      <h3 id="work-${p.slug}-title" class="display work__title" data-warp-title><a class="work__name-link" href="/cases/${p.slug}/">${lines(p.titleLines)}</a></h3>
      <p class="work__pitch" data-highlight>${esc(p.pitch)}</p>
      <div class="work__links">
        <a class="btn" href="/cases/${p.slug}/" data-roll><span class="btn__label">View Case Study</span></a>
      </div>
    </div>
    <div class="carousel" data-carousel>
      <ul class="carousel__track" data-carousel-track aria-label="${esc(p.title)} screens">${slides}</ul>
      <div class="carousel__dots" data-carousel-dots>${dots}</div>
    </div>
  </article>`;
}

function renderWork() {
  return `
<section class="section section--featured" aria-labelledby="featured-title">
  <div class="featured__stage">
    <h2 id="featured-title" class="display featured__title" data-warp-title="big">FEATURED PROJECTS</h2>
  </div>
</section>
<section id="work" class="section section--work" aria-label="Selected work">
  ${projects.map(renderWorkItem).join('')}
</section>`;
}

function renderAbout() {
  return `
<section id="about" class="section section--about" aria-labelledby="about-title">
  <div class="about__media" aria-hidden="true" data-about-media>
    <img src="${about.portrait.src}" alt="" width="900" height="1200" loading="lazy" decoding="async" />
  </div>
  <div class="about__copy">
    <h2 id="about-title" class="display display--120 about__title" data-reveal-outline>${lines(about.title)}</h2>
    <div class="about__text" data-highlight>${paras(about.paragraphs, 'about__p')}</div>
    <p class="about__signature script" data-signature><span class="visually-hidden">Signed, </span><span aria-hidden="true">${esc(about.signature)}</span></p>
  </div>
</section>`;
}

export function renderOutro(opts: { next?: Project } = {}) {
  const cols = outro.columns
    .map(
      (c) => `
    <div class="outro__col">
      <h2 class="display outro__title" data-reveal-chars>${esc(c.title)}</h2>
      <a class="outro__link link link--roll" href="${c.link.href}"${'external' in c.link && c.link.external ? ' rel="me noopener" target="_blank"' : ''}${'copy' in c.link && c.link.copy ? ' data-copy-email' : ''} data-roll>${esc(c.link.label)}</a>
    </div>`,
    )
    .join('');
  const next = opts.next
    ? `<p class="outro__next"><a class="btn" href="/cases/${opts.next.slug}/" data-roll><span class="btn__label">Next: ${esc(opts.next.title)}</span></a></p>`
    : '';
  return `
<footer id="outro" class="section section--outro" aria-labelledby="outro-title" data-outro>
  <div class="outro__glow" aria-hidden="true" data-outro-glow></div>
  <div class="outro__inner">
    <h2 id="outro-title" class="visually-hidden">Contact</h2>
    ${cols}
    ${next}
  </div>
  <p class="outro__copyright">© ${site.year} ${esc(site.name)}</p>
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
${renderOutro()}
<div class="toast" role="status" aria-live="polite" data-toast></div>
<div class="lightbox" data-lightbox-root aria-hidden="true" inert><img class="lightbox__img" alt="" data-lightbox-img /><button class="lightbox__close" type="button" data-lightbox-close>Close</button></div>`;
}

/* ---------------------------------------------------------------- case */

function renderChapter(c: CaseChapter, i: number) {
  const index = String(i + 1).padStart(2, '0');
  const blocks = c.blocks?.length
    ? `<div class="band__blocks">${c.blocks
        .map((b) => `<div class="band__block"><h3 class="band__subtitle">${esc(b.heading)}</h3>${paras(b.paragraphs)}</div>`)
        .join('')}</div>`
    : '';
  const metrics = c.metrics?.length
    ? `<dl class="metrics">${c.metrics
        .map((m) => `<div class="metric"><dd class="metric__value display">${esc(m.value)}</dd><dt class="metric__label">${esc(m.label)}</dt></div>`)
        .join('')}</dl>`
    : '';
  const features = c.features?.length
    ? `<div class="band__features">${c.features
        .map(
          (f) => `
        <div class="band__feature">
          ${f.name ? `<h3 class="band__feature-name">${esc(f.name)}</h3>` : ''}
          ${f.tagline ? `<p class="band__feature-tagline">${esc(f.tagline)}</p>` : ''}
          ${frame(f, ' fold', ` data-fold data-lightbox="${f.src}"`)}
        </div>`,
        )
        .join('')}</div>`
    : '';
  return `
  <section class="band band--${c.id}" id="${c.id}" data-chapter="${index}" data-chapter-label="${esc(c.label)}" aria-labelledby="${c.id}-title">
    <div class="wrap band__inner">
      <p class="band__label"><span>${index}</span></p>
      <h2 id="${c.id}-title" class="display band__title" data-reveal-chars>${esc(c.title)}</h2>
      <div class="band__copy" data-highlight>${paras(c.paragraphs)}${blocks}</div>
      ${metrics}
      ${features}
    </div>
  </section>`;
}

export function renderCase(p: Project) {
  const idx = projects.findIndex((x) => x.slug === p.slug);
  const next = projects[(idx + 1) % projects.length];
  const first = p.case.chapters[0];
  return `
${renderHeader('case', { index: '01', label: first.label })}
<main id="main" class="case">
  <section class="case-head" aria-labelledby="case-title">
    <div class="wrap">
      <h1 id="case-title" class="display case-head__title" data-reveal-chars>${lines(p.titleLines)}</h1>
      <div class="case-head__grid">
        <p class="case-head__intro" data-reveal-words>${esc(p.case.intro)}</p>
        <dl class="case-head__meta" data-reveal-rows>
          <div><dt>My role</dt><dd>${esc(p.case.role)}</dd></div>
          <div><dt>Timeline</dt><dd>${esc(p.case.timeline)}</dd></div>
          <div><dt>Team</dt><dd>${esc(p.case.team)}</dd></div>
        </dl>
      </div>
    </div>
  </section>
  <figure class="case-head__hero" data-fold="hero">
    <img src="${p.case.hero.src}" alt="${esc(p.case.hero.alt)}" width="1707" height="914" decoding="async" fetchpriority="high" />
  </figure>
  <div class="bands" id="work">
    ${p.case.chapters.map(renderChapter).join('')}
    ${p.case.link ? `<div class="wrap"><p class="case__visit"><a class="btn" href="${p.case.link.href}" rel="noopener" target="_blank" data-roll><span class="btn__label">${esc(p.case.link.label)} ↗</span></a></p></div>` : ''}
  </div>
</main>
${renderOutro({ next })}
<div class="toast" role="status" aria-live="polite" data-toast></div>
<div class="lightbox" data-lightbox-root aria-hidden="true" inert><img class="lightbox__img" alt="" data-lightbox-img /><button class="lightbox__close" type="button" data-lightbox-close>Close</button></div>`;
}

export function caseMeta(p: Project) {
  return { title: `${p.title} — ${site.name}`, description: p.pitch, path: `/cases/${p.slug}/` };
}

export function homeMeta() {
  return { title: `${site.name} — ${site.role}, ${site.location}`, description: site.description, path: '/' };
}
