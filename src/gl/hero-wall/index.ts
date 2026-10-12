/**
 * Hero wall — an endless grid of project cards, after Phantom.land's
 * interactive grid (Codrops, "Invisible Forces: The Making of Phantom.land's
 * Interactive Grid", 2025), re-built as one full-screen fragment pass on
 * three.js so it shares the renderer with the later scenes.
 *
 *  · cards: dark square cards with client · title on top, tags · year below
 *    and the project media inset, baked into one atlas
 *  · barrel distortion + corner vignette (their DistortionShader), tweened from
 *    flat to curved as the grid arrives
 *  · drag in any direction forever; their inertia (velocity.lerp(drag, .8)
 *    while dragging, offset += velocity; velocity.lerp(0, .1) after)
 *  · press to zoom the camera out a touch, release to come back (1s,
 *    cubic-bezier(.23,1,.32,1))
 *  · ambient drift: the grid leans ~2% of the viewport towards the cursor
 *  · scroll dollies (zooms) into the card nearest the centre; click opens its case
 */
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  GLSL3,
  LinearFilter,
  Mesh,
  NoColorSpace,
  OrthographicCamera,
  RawShaderMaterial,
  Scene,
  WebGLRenderer,
  ClampToEdgeWrapping,
} from 'three';
import { CustomEase } from 'gsap/CustomEase';
import { gsap } from '../../core/gsap';
import { coarsePointer } from '../../core/rm';
import { fragmentShader, vertexShader } from './tile.glsl';

gsap.registerPlugin(CustomEase);
const PRESS_EASE = CustomEase.create('phantomPress', '0.23, 1, 0.32, 1');

export interface HeroCard {
  src: string;
  client: string;
  title: string;
  tags: string[];
  year: string;
}

export interface HeroWallOptions {
  canvas: HTMLCanvasElement;
  /** Unique cards, ordered group-interleaved (index % groups = project). */
  cards: HeroCard[];
  /** Number of projects the cards cycle through (default 4). */
  groups?: number;
  /** Called with the card index when a card is clicked (not dragged). */
  onTileClick?: (index: number, card: HeroCard) => void;
  onReady?: () => void;
}

export interface HeroWall {
  /** Resolves once the atlas is on the GPU. */
  ready: Promise<void>;
  /** Centre-out reveal + flat → curved, after an optional delay in seconds. */
  reveal(delay?: number): gsap.core.Timeline;
  /** 0 → 1 scroll progress: dolly into the nearest card, then dim. */
  setProgress(p: number): void;
  start(): void;
  stop(): void;
  destroy(): void;
}

/* ---- tuning --------------------------------------------------------------- */
// Measured on phantom.land at 1707×1015: 271px cards on a 283px pitch at the centre.
// The shader samples at 0.88 (their base scale), so nominal = apparent × 0.88.
const TILE_VW = 0.14;
const GAP_VW = 0.0062;
const TILE_VW_PORTRAIT = 0.335;
const GAP_VW_PORTRAIT = 0.014;
const RADIUS_PX = 6;
const MEDIA_FRAC = 0.64; // media square as a fraction of the card (atlas + .wall__tile img)
const ATLAS_CELL = 896;
const BASE_SCALE = 0.88; // Phantom's constant
const DISTORTION_CURVED = 0.2; // their `curved` preset (eyeballed against phantom.land)
const DISTORTION_FLAT = 0;
const VIG_OFFSET = 0.15;
const VIG_DARKNESS = 0.38;
const PRESS_ZOOM = 1.16; // camera z 0 → 0.5 in their scene ≈ a 16% wider view
const AMBIENT = 0.02; // grid drift towards the pointer, as a fraction of the viewport
const DPR_MAX = 1.5; // full-screen fragment pass: fill-rate bound

/** Same integer hash as the shader, so clicks resolve to the drawn image. */
function hashCell(col: number, row: number, seed: number) {
  let h = (Math.imul(col, 374761393) + Math.imul(row, 668265263) + Math.imul(seed, -2048144777)) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177) | 0;
  return (h ^ (h >>> 16)) >>> 0;
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Draws every card into a square-ish atlas: a dark rounded card, client (left)
 * and title (right) along the top, the media as an inset square, tag chips and
 * the year along the bottom — the same layout as the static `.wall__tile`.
 */
async function buildAtlas(cards: HeroCard[], cell = ATLAS_CELL) {
  const cols = Math.ceil(Math.sqrt(cards.length));
  const rows = Math.ceil(cards.length / cols);
  const canvas = document.createElement('canvas');
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const images = await Promise.all(cards.map((c) => loadImage(c.src)));
  const font = (px: number, weight = 400) => `${weight} ${px}px "Instrument Sans", system-ui, sans-serif`;
  const pad = cell * 0.06;
  const textPx = cell * 0.027; // ≈7px on a 271px card
  const mediaSize = cell * MEDIA_FRAC;

  cards.forEach((card, i) => {
    const x0 = (i % cols) * cell;
    const y0 = Math.floor(i / cols) * cell;
    ctx.save();
    ctx.translate(x0, y0);
    // card
    roundRect(ctx, 0.5, 0.5, cell - 1, cell - 1, cell * 0.022);
    ctx.fillStyle = '#121212';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // media (cover-fit into an inset square)
    const img = images[i];
    const mx = (cell - mediaSize) / 2;
    const my = (cell - mediaSize) / 2;
    roundRect(ctx, mx, my, mediaSize, mediaSize, cell * 0.012);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(mx, my, mediaSize, mediaSize);
    if (img) {
      const s = Math.max(mediaSize / img.width, mediaSize / img.height);
      const w = img.width * s;
      const h = img.height * s;
      ctx.drawImage(img, mx + (mediaSize - w) / 2, my + (mediaSize - h) / 2, w, h);
    }
    ctx.restore();
    // top row: client (left, sentence case, semibold) · title (right, caps)
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textBaseline = 'top';
    ctx.font = font(textPx, 600);
    ctx.textAlign = 'left';
    ctx.fillText(card.client, pad, pad);
    ctx.font = font(textPx);
    ctx.textAlign = 'right';
    if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${textPx * 0.04}px`;
    ctx.fillText(card.title.toUpperCase(), cell - pad, pad);
    // bottom row: tag chips (left) · year (right)
    const chipH = textPx * 1.9;
    const by = cell - pad - chipH;
    let bx = pad;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1.5;
    for (const tag of card.tags) {
      const label = tag.toUpperCase();
      const w = ctx.measureText(label).width + textPx * 1.2;
      roundRect(ctx, bx, by, w, chipH, chipH / 2);
      ctx.stroke();
      ctx.fillText(label, bx + textPx * 0.6, by + chipH / 2 + textPx * 0.05);
      bx += w + textPx * 0.45;
    }
    ctx.textAlign = 'right';
    ctx.fillText(card.year, cell - pad, by + chipH / 2 + textPx * 0.05);
    ctx.restore();
  });
  return { canvas, cols, rows, count: cards.length };
}

export function createHeroWall(opts: HeroWallOptions): HeroWall | null {
  const { canvas, cards } = opts;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  if (!renderer.capabilities.isWebGL2) {
    renderer.dispose();
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  /* ---- full-screen triangle ---------------------------------------------- */
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const atlasTex = new CanvasTexture(document.createElement('canvas'));
  atlasTex.colorSpace = NoColorSpace; // sRGB bytes pass straight through to the screen
  atlasTex.minFilter = LinearFilter;
  atlasTex.magFilter = LinearFilter;
  atlasTex.generateMipmaps = false;
  atlasTex.wrapS = atlasTex.wrapT = ClampToEdgeWrapping;
  atlasTex.flipY = false;

  const u = {
    uResolution: { value: [1, 1] as [number, number] },
    uOffset: { value: [0, 0] as [number, number] },
    uTileW: { value: 300 },
    uTileH: { value: 300 },
    uGap: { value: 30 },
    uRadius: { value: RADIUS_PX },
    uDistortion: { value: DISTORTION_FLAT },
    uScale: { value: BASE_SCALE },
    uVigOffset: { value: VIG_OFFSET },
    uVigDarkness: { value: VIG_DARKNESS },
    uDim: { value: 1 },
    uRevealT: { value: -1 },
    uAtlas: { value: atlasTex },
    uAtlasCols: { value: 1 },
    uAtlasRows: { value: 1 },
    uAtlasCount: { value: 1 },
    uSeed: { value: 7 },
    uGroups: { value: opts.groups ?? 4 },
  };
  const material = new RawShaderMaterial({
    glslVersion: GLSL3,
    vertexShader,
    fragmentShader,
    uniforms: u,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const scene = new Scene();
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  /* ---- state (CSS px) ------------------------------------------------------ */
  const size = { w: 1, h: 1, dpr: 1, tile: 300, gap: 30 };
  const grid = { x: 0, y: 0 }; // offset in CSS px
  const vel = { x: 0, y: 0 }; // px per frame (their velocity vector)
  const state = { progress: 0, dragging: false, moved: false, running: false, visible: true };
  const home = { x: 0, y: 0 }; // offset used during the dolly: grid eased onto the nearest card
  const curve = { distortion: DISTORTION_FLAT, press: 1, zoom: 0 }; // tweened by gsap
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 }; // ambient drift, −1..1
  let last = { x: 0, y: 0 };

  const cellW = () => size.tile + size.gap;

  function layout() {
    size.w = canvas.clientWidth || 1;
    size.h = canvas.clientHeight || 1;
    size.dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    const portrait = size.w / size.h < 0.8;
    const prevCell = cellW();
    size.tile = Math.round(size.w * (portrait ? TILE_VW_PORTRAIT : TILE_VW));
    size.gap = Math.round(size.w * (portrait ? GAP_VW_PORTRAIT : GAP_VW));
    // keep the same cell under the centre when the cell size changes
    if (prevCell !== cellW()) {
      const ratio = cellW() / prevCell;
      grid.x = (grid.x + size.w / 2) * ratio - size.w / 2;
      grid.y = (grid.y + size.h / 2) * ratio - size.h / 2;
    }
    renderer.setPixelRatio(size.dpr);
    renderer.setSize(size.w, size.h, false);
    u.uResolution.value = [size.w * size.dpr, size.h * size.dpr];
    u.uTileW.value = size.tile * size.dpr;
    u.uTileH.value = size.tile * size.dpr;
    u.uGap.value = size.gap * size.dpr;
    u.uRadius.value = RADIUS_PX * size.dpr;
  }

  /** Offset that puts the centre of the nearest cell exactly at the screen centre. */
  function nearestTileOffset() {
    const c = cellW();
    const cx = size.w / 2 + grid.x; // grid-space point under the screen centre
    const cy = size.h / 2 + grid.y;
    return {
      x: (Math.floor(cx / c) + 0.5) * c - size.w / 2,
      y: (Math.floor(cy / c) + 0.5) * c - size.h / 2,
    };
  }

  function applyProgress() {
    const p = state.progress;
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
    const zoomEnd = (Math.max(size.w, size.h) / (size.tile * MEDIA_FRAC)) * BASE_SCALE * 1.1 - 1; // the centre card's media overfills the viewport
    curve.zoom = e * zoomEnd;
    u.uDim.value = 1 - Math.max(0, (p - 0.78) / 0.22);
    if (p > 0 && !state.dragging) {
      const snap = nearestTileOffset();
      const k = Math.min(1, p / 0.35);
      home.x = grid.x + (snap.x - grid.x) * k;
      home.y = grid.y + (snap.y - grid.y) * k;
    }
  }

  let lastFrame = performance.now();
  function render() {
    const now = performance.now();
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    const steps = dt * 60;
    if (!state.dragging) {
      // their loop: positionOffset += velocity; velocity.lerp(0, 0.1)
      if (Math.abs(vel.x) > 0.02 || Math.abs(vel.y) > 0.02) {
        grid.x += vel.x * steps;
        grid.y += vel.y * steps;
        const keep = Math.pow(0.9, steps);
        vel.x *= keep;
        vel.y *= keep;
        if (state.progress > 0) applyProgress();
      } else {
        vel.x = vel.y = 0;
      }
    }
    // ambient drift towards the cursor
    ptr.x += (ptr.tx - ptr.x) * 0.06;
    ptr.y += (ptr.ty - ptr.y) * 0.06;
    const ambX = -ptr.x * AMBIENT * size.w * (1 - Math.min(1, state.progress * 3));
    const ambY = -ptr.y * AMBIENT * size.w * (1 - Math.min(1, state.progress * 3));

    const useHome = state.progress > 0 && !state.dragging;
    const ox = (useHome ? home.x : grid.x) + ambX;
    const oy = (useHome ? home.y : grid.y) + ambY;
    u.uOffset.value = [ox * size.dpr, oy * size.dpr];
    const e = Math.min(1, state.progress / 0.5);
    u.uDistortion.value = curve.distortion * (1 - e) * curve.press; // flattens as we fly in
    u.uScale.value = (BASE_SCALE * curve.press) / Math.max(1 + curve.zoom, 0.01);
    renderer.render(scene, camera);
  }

  /* ---- hit test (same forward maths as the shader) -------------------------- */
  function hitTest(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    let sx = 2 * (px / size.w - 0.5);
    let sy = 2 * (py / size.h - 0.5);
    const f = u.uScale.value + u.uDistortion.value * (sx * sx + sy * sy);
    sx *= f;
    sy *= f;
    const ox = (u.uOffset.value[0] ?? 0) / size.dpr;
    const oy = (u.uOffset.value[1] ?? 0) / size.dpr;
    const gx = size.w / 2 + sx * (size.w / 2) + ox;
    const gy = size.h / 2 + sy * (size.h / 2) + oy;
    const c = cellW();
    const col = Math.floor(gx / c);
    const row = Math.floor(gy / c);
    const lx = gx - col * c - size.gap / 2;
    const ly = gy - row * c - size.gap / 2;
    if (lx < 0 || lx > size.tile || ly < 0 || ly > size.tile) return null;
    const count = cards.length;
    const groups = Math.max(1, u.uGroups.value);
    const variants = Math.max(1, Math.floor(count / groups));
    const group = (((col + 2 * row) % groups) + groups) % groups;
    const variant = hashCell(col, row, u.uSeed.value) % variants;
    const idx = Math.min(group + groups * variant, count - 1);
    return { index: idx, card: cards[idx] };
  }

  /* ---- press zoom (their camera z 0 → 0.5 on press, back on release) ------- */
  function pressZoom(on: boolean) {
    gsap.to(curve, { press: on ? PRESS_ZOOM : 1, duration: 1, ease: PRESS_EASE, overwrite: true });
  }

  /* ---- drag ----------------------------------------------------------------- */
  function onDown(e: PointerEvent) {
    if (e.button !== 0) return;
    state.dragging = true;
    state.moved = false;
    vel.x = vel.y = 0;
    last = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
    if (state.progress === 0) pressZoom(true);
  }
  function onMove(e: PointerEvent) {
    if (!state.dragging) return;
    const dx = e.clientX - last.x;
    const dy = coarsePointer ? 0 : e.clientY - last.y; // on touch, vertical swipes scroll the page
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) state.moved = true;
    // their drag: positionOffset += dragAction; velocity.lerp(dragAction, 0.8)
    grid.x -= dx;
    grid.y -= dy;
    vel.x += (-dx - vel.x) * 0.8;
    vel.y += (-dy - vel.y) * 0.8;
    last = { x: e.clientX, y: e.clientY };
  }
  function onUp(e: PointerEvent) {
    if (!state.dragging) return;
    state.dragging = false;
    canvas.classList.remove('is-dragging');
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    pressZoom(false);
    if (!state.moved && e.type === 'pointerup') {
      const hit = hitTest(e.clientX, e.clientY);
      if (hit) opts.onTileClick?.(hit.index, hit.card);
    }
  }
  function onHover(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    ptr.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    ptr.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  if (!coarsePointer) window.addEventListener('pointermove', onHover, { passive: true });

  /* ---- loop + visibility --------------------------------------------------- */
  const tick = () => render();
  const ro = new ResizeObserver(layout);
  ro.observe(canvas);
  layout();
  // start with a card exactly under the screen centre
  const start = nearestTileOffset();
  grid.x = start.x;
  grid.y = start.y;

  const io = new IntersectionObserver(
    ([entry]) => {
      state.visible = entry.isIntersecting;
      if (state.running) state.visible ? gsap.ticker.add(tick) : gsap.ticker.remove(tick);
    },
    { threshold: 0 },
  );
  io.observe(canvas);
  const onVis = () => {
    if (!state.running) return;
    document.hidden ? gsap.ticker.remove(tick) : state.visible && gsap.ticker.add(tick);
  };
  document.addEventListener('visibilitychange', onVis);

  /* ---- atlas ------------------------------------------------------------------ */
  const atlasReady = buildAtlas(cards).then(({ canvas: c, cols, rows, count }) => {
    atlasTex.image = c;
    atlasTex.needsUpdate = true;
    u.uAtlasCols.value = cols;
    u.uAtlasRows.value = rows;
    u.uAtlasCount.value = count;
    opts.onReady?.();
  });

  const api: HeroWall = {
    ready: atlasReady,
    reveal(delay = 0) {
      const total = 7 * 0.075 + 1.15;
      const tl = gsap.timeline({ delay });
      tl.fromTo(u.uRevealT, { value: 0 }, { value: total, duration: total, ease: 'none' }, 0);
      // their intro: distortion flat → curved, 1s power2.out, once the grid is in
      tl.to(curve, { distortion: DISTORTION_CURVED, duration: 1, ease: 'power2.out' }, 0.35);
      return tl;
    },
    setProgress(p) {
      state.progress = Math.min(1, Math.max(0, p));
      applyProgress();
    },
    start() {
      if (state.running) return;
      state.running = true;
      lastFrame = performance.now();
      applyProgress();
      if (state.visible) gsap.ticker.add(tick);
    },
    stop() {
      state.running = false;
      gsap.ticker.remove(tick);
    },
    destroy() {
      api.stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      window.removeEventListener('pointermove', onHover);
      material.dispose();
      geometry.dispose();
      atlasTex.dispose();
      renderer.dispose();
    },
  };
  return api;
}
