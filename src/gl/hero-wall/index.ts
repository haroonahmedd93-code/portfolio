/**
 * Hero wall — the "inverted dome" of project tiles.
 *
 * An endless grid of square tiles, drawn in one full-screen fragment pass and
 * bent with a pincushion lens so the whole surface (tiles and gutters) reads
 * as the inside of a dome. Drag in any direction forever, with a friction
 * glide; scroll dollies (zooms) into the tile nearest the centre; click a tile
 * to open its case study.
 *
 * Technique after dipayanmaji/inverted-dome (lens grid + hashed cells),
 * re-implemented on three.js so it shares the renderer with later scenes.
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
import { gsap } from '../../core/gsap';
import { coarsePointer } from '../../core/rm';
import { fragmentShader, vertexShader } from './tile.glsl';

export interface HeroWallOptions {
  canvas: HTMLCanvasElement;
  /** Unique tile images, ordered group-interleaved (index % groups = project). */
  tiles: string[];
  /** Number of projects the tiles cycle through (default 4). */
  groups?: number;
  /** Called with the tile's image index when a tile is clicked (not dragged). */
  onTileClick?: (index: number, src: string) => void;
  onReady?: () => void;
}

export interface HeroWall {
  /** Resolves once the atlas is on the GPU. */
  ready: Promise<void>;
  /** Centre-out reveal (H4), after an optional delay in seconds. */
  reveal(delay?: number): gsap.core.Tween;
  /** 0 → 1 scroll progress: dolly into the nearest tile, then dim (H5/H7). */
  setProgress(p: number): void;
  start(): void;
  stop(): void;
  destroy(): void;
}

/* ---- tuning (CSS px, as fractions of the viewport width) ------------------ */
const TILE_VW = 0.192; // 327px at 1707 — measured from the reference
const GAP_VW = 0.022;
const TILE_VW_PORTRAIT = 0.4;
const GAP_VW_PORTRAIT = 0.04;
const RADIUS_PX = 16;
const CURVE = 0.55; // lens strength
const CURVE_RADIUS = 1.45; // lens reach
const VIGNETTE = 0.3;
const FRICTION = 0.92; // velocity kept per frame after release
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

/** Packs the unique tiles into a square-ish atlas canvas (cover-fit, clipped). */
async function buildAtlas(urls: string[], cell = 768) {
  const cols = Math.ceil(Math.sqrt(urls.length));
  const rows = Math.ceil(urls.length / cols);
  const canvas = document.createElement('canvas');
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const images = await Promise.all(urls.map(loadImage));
  images.forEach((img, i) => {
    if (!img) return;
    const x = (i % cols) * cell;
    const y = Math.floor(i / cols) * cell;
    const s = Math.max(cell / img.width, cell / img.height);
    const w = img.width * s;
    const h = img.height * s;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cell, cell);
    ctx.clip();
    ctx.drawImage(img, x + (cell - w) / 2, y + (cell - h) / 2, w, h);
    ctx.restore();
  });
  return { canvas, cols, rows, count: urls.length };
}

export function createHeroWall(opts: HeroWallOptions): HeroWall | null {
  const { canvas, tiles } = opts;

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
    uCurve: { value: CURVE },
    uCurveRadius: { value: CURVE_RADIUS },
    uZoom: { value: 0 },
    uVignette: { value: VIGNETTE },
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
  const vel = { x: 0, y: 0 };
  const state = { progress: 0, dragging: false, moved: false, running: false, visible: true };
  const home = { x: 0, y: 0 }; // offset used during the dolly: grid eased onto the nearest tile
  let last = { x: 0, y: 0, t: 0 };

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
    const zoomEnd = (Math.max(size.w, size.h) / size.tile) * 1.15 - 1; // centre tile overfills the viewport
    u.uZoom.value = e * zoomEnd;
    u.uCurve.value = CURVE * (1 - e); // flatten the lens as we fly in
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
    if (!state.dragging) {
      if (Math.abs(vel.x) > 0.01 || Math.abs(vel.y) > 0.01) {
        grid.x += vel.x * dt * 60;
        grid.y += vel.y * dt * 60;
        vel.x *= FRICTION;
        vel.y *= FRICTION;
        if (state.progress > 0) applyProgress();
      } else {
        vel.x = vel.y = 0;
      }
    }
    const useHome = state.progress > 0 && !state.dragging;
    const ox = useHome ? home.x : grid.x;
    const oy = useHome ? home.y : grid.y;
    u.uOffset.value = [ox * size.dpr, oy * size.dpr];
    renderer.render(scene, camera);
  }

  /* ---- hit test (same forward maths as the shader) -------------------------- */
  function hitTest(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const cx = size.w / 2;
    const cy = size.h / 2;
    const dx = px - cx;
    const dy = py - cy;
    const r = Math.hypot(dx, dy);
    const halfDiag = Math.max(Math.hypot(cx, cy), 1);
    const reach = Math.max(halfDiag * CURVE_RADIUS, 1);
    const k = u.uCurve.value / (reach * reach);
    const distortedR = r / (1 + Math.min(k * r * r, 0.95));
    const zf = Math.max(1 + u.uZoom.value, 0.01);
    const sx = cx + (r > 0 ? (dx / r) * distortedR : 0) / zf + grid.x;
    const sy = cy + (r > 0 ? (dy / r) * distortedR : 0) / zf + grid.y;
    const c = cellW();
    const col = Math.floor(sx / c);
    const row = Math.floor(sy / c);
    const lx = sx - col * c - size.gap / 2;
    const ly = sy - row * c - size.gap / 2;
    if (lx < 0 || lx > size.tile || ly < 0 || ly > size.tile) return null;
    const count = tiles.length;
    const groups = Math.max(1, u.uGroups.value);
    const variants = Math.max(1, Math.floor(count / groups));
    const group = (((col + 2 * row) % groups) + groups) % groups;
    const variant = hashCell(col, row, u.uSeed.value) % variants;
    const idx = Math.min(group + groups * variant, count - 1);
    return { index: idx, src: tiles[idx] };
  }

  /* ---- drag ----------------------------------------------------------------- */
  function onDown(e: PointerEvent) {
    if (e.button !== 0) return;
    state.dragging = true;
    state.moved = false;
    vel.x = vel.y = 0;
    last = { x: e.clientX, y: e.clientY, t: performance.now() };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
  }
  function onMove(e: PointerEvent) {
    if (!state.dragging) return;
    const now = performance.now();
    const dt = Math.max(now - last.t, 1);
    const dx = e.clientX - last.x;
    const dy = coarsePointer ? 0 : e.clientY - last.y; // on touch, vertical swipes scroll the page
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) state.moved = true;
    grid.x -= dx; // grab-and-move: content follows the pointer
    grid.y -= dy;
    vel.x = -(dx / dt) * 16;
    vel.y = -(dy / dt) * 16;
    last = { x: e.clientX, y: e.clientY, t: now };
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
    if (!state.moved && e.type === 'pointerup') {
      const hit = hitTest(e.clientX, e.clientY);
      if (hit) opts.onTileClick?.(hit.index, hit.src);
    }
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  /* ---- loop + visibility --------------------------------------------------- */
  const tick = () => render();
  const ro = new ResizeObserver(layout);
  ro.observe(canvas);
  layout();
  // start with a tile exactly under the screen centre
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
  const atlasReady = buildAtlas(tiles).then(({ canvas: c, cols, rows, count }) => {
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
      return gsap.fromTo(u.uRevealT, { value: 0 }, { value: total, duration: total, ease: 'none', delay });
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
      material.dispose();
      geometry.dispose();
      atlasTex.dispose();
      renderer.dispose();
    },
  };
  return api;
}
