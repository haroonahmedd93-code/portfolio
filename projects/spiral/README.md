# Spiral Gallery

A Three.js + Lenis + GSAP scroll-driven spherical gallery, ported from jordigarreta.com. Drag to scroll, click a card to open the project view. List toggle at bottom right.

## Setup

1. Drop the folder into your portfolio repo (e.g. `/spiral-gallery/` at root or `/src/spiral-gallery/`)
2. Update `projects.js` with your real projects, add `image` URLs
3. Commit, push, Vercel auto-deploys
4. Wire `/projects/` to serve this folder (or rename folder to match your route structure)

## Files

- **index.html** — DOM structure, imports main.js via `<script type="module">`
- **main.js** — Three.js sketch, Lenis scroll driver, GSAP transitions, view toggling
- **projects.js** — Data-only file, edit here (slug, title, client, year, role, tags, description, optional image URL)
- **style.css** — Compact layout: fixed canvas, positioned UI layers, mobile-responsive grid

## Customization

- Edit colors in `style.css` `:root` (bg, fg, mute)
- Adjust camera `z` (line ~57 main.js) for spiral width
- `TURNS` constant (line ~15) controls helix rotations
- Mouse bulge, deform, afterimage — all tweakable shader uniforms

## Deps

- Three.js (from CDN via import map)
- GSAP (CDN)
- Lenis (CDN)
- ~20KB gzipped

No build needed; static files only.
