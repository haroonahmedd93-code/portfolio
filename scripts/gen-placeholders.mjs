// Generates placeholder SVG media into public/media. Run: node scripts/gen-placeholders.mjs
// Colour lives only in media (never in UI chrome) — see 01-design-tokens.md.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/media');
mkdirSync(out, { recursive: true });

const palettes = {
  bayut: ['#0a0b24', '#7b3cff', '#6ff6ff'],
  motive: ['#0a0b24', '#e8742e', '#e04bff'],
  trueframe: ['#06070f', '#6ff6ff', '#7b3cff'],
  yallamotor: ['#120a0b', '#e04bff', '#e8742e'],
  portrait: ['#000000', '#1b1b1b', '#3a2a52'],
};

function svg(w, h, [bg, a, b], label, opts = {}) {
  const id = Math.random().toString(36).slice(2, 8);
  const r = opts.radius ?? Math.round(Math.min(w, h) * 0.03);
  const fs = Math.round(Math.min(w, h) * 0.07);
  const sub = opts.sub ? `<text x="${w / 2}" y="${h / 2 + fs * 1.1}" fill="rgba(255,255,255,.55)" font-family="Instrument Sans, Helvetica, Arial, sans-serif" font-size="${fs * 0.42}" text-anchor="middle">${opts.sub}</text>` : '';
  // A few UI-ish rectangles so frames read as screens rather than flat colour
  const ui = opts.ui === false ? '' : `
  <g fill="rgba(255,255,255,.08)">
    <rect x="${w * 0.06}" y="${h * 0.08}" width="${w * 0.22}" height="${h * 0.035}" rx="${h * 0.0175}"/>
    <rect x="${w * 0.06}" y="${h * 0.16}" width="${w * 0.88}" height="${h * 0.09}" rx="${h * 0.02}"/>
    <rect x="${w * 0.06}" y="${h * 0.30}" width="${w * 0.42}" height="${h * 0.56}" rx="${h * 0.02}"/>
    <rect x="${w * 0.52}" y="${h * 0.30}" width="${w * 0.42}" height="${h * 0.26}" rx="${h * 0.02}"/>
    <rect x="${w * 0.52}" y="${h * 0.60}" width="${w * 0.42}" height="${h * 0.26}" rx="${h * 0.02}"/>
  </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label} placeholder">
  <defs>
    <linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg}"/><stop offset=".55" stop-color="${a}" stop-opacity=".55"/><stop offset="1" stop-color="${b}" stop-opacity=".75"/>
    </linearGradient>
    <radialGradient id="r${id}" cx="70%" cy="20%" r="70%">
      <stop offset="0" stop-color="${b}" stop-opacity=".5"/><stop offset="1" stop-color="${bg}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" rx="${r}" fill="url(#g${id})"/>
  <rect width="${w}" height="${h}" rx="${r}" fill="url(#r${id})"/>${ui}
  <text x="${w / 2}" y="${h / 2 + fs * 0.35}" fill="rgba(255,255,255,.9)" font-family="Big Shoulders Display, Impact, sans-serif" font-weight="900" font-size="${fs}" letter-spacing="-.01em" text-anchor="middle">${label}</text>
  ${sub}
</svg>`;
}

const write = (name, content) => writeFileSync(resolve(out, `${name}.svg`), content);

const sizes = { desktop: [1600, 1000], phone: [390, 844], tablet: [1024, 768] };
const frames = {
  bayut: ['desktop', 'desktop', 'desktop', 'phone', 'desktop'],
  motive: ['desktop', 'desktop', 'phone', 'desktop'],
  trueframe: ['desktop', 'desktop', 'desktop', 'phone'],
  yallamotor: ['desktop', 'phone', 'desktop', 'desktop'],
};

for (const [slug, kinds] of Object.entries(frames)) {
  const pal = palettes[slug];
  const label = slug.toUpperCase();
  kinds.forEach((kind, i) => {
    const [w, h] = sizes[kind];
    write(`${slug}-${String(i + 1).padStart(2, '0')}`, svg(w, h, pal, label, { sub: `Screen ${i + 1} · placeholder`, radius: kind === 'phone' ? 48 : 24 }));
  });
  write(`${slug}-hero`, svg(1920, 1080, pal, label, { sub: 'Case hero · placeholder', radius: 0 }));
  for (let t = 1; t <= 3; t++) write(`tile-${slug}-${t}`, svg(1200, 900, pal, label, { sub: `Tile ${t}`, radius: 0 }));
}

write('portrait', svg(900, 1200, palettes.portrait, '', { ui: false, radius: 0, sub: 'Portrait · placeholder' }));
write('og', svg(1200, 630, palettes.bayut, 'HAROON AHMED BUTT', { ui: false, radius: 0, sub: 'Senior Product Designer · Dubai' }));

writeFileSync(
  resolve(out, '../favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#000"/><path d="M9 8c2.5 2 3 10 3 16s-.5 14-3 16M9 24h13M22 8c2.5 2 3 10 3 16s-.5 14-3 16M31 40c.8-6 3-14 6-20 1-2 2-4 1-6-1-1-3 0-4 2 2-1 4 0 5 2 1.5 3 1 8 2 12 .5 3 1 6 0 10" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
);
console.log('placeholders written to', out);
