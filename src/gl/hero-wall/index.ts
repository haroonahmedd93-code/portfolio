/**
 * Hero wall — the "inverted dome" of project tiles.
 *
 * Real 3D: every tile is a flat square plane sitting on the inside of a
 * sphere whose centre is the camera, facing inward (rotateY(θ) · rotateX(φ) ·
 * translateZ(−R), the dome-gallery construction), so tiles away from the
 * centre tilt in perspective while their faces stay crisp. The lattice is an
 * endless flat grid in px: a tile at grid offset (u, v) from the screen centre
 * sits at angles (u/R, v/R), with R = the camera's focal length — so dragging
 * slides the grid across the dome forever in any direction. Scroll dollies the
 * camera into the tile under the centre; click opens a case.
 */
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  GLSL3,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearFilter,
  Matrix4,
  NoColorSpace,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  RawShaderMaterial,
  Scene,
  Vector2,
  WebGLRenderer,
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

/* ---- tuning (measured on the reference at 1707×1015) ------------------------ */
const TILE_VW = 0.192; // 327px tiles
const GAP_VW = 0.022; // 38px gutters → 365px pitch
const TILE_VW_PORTRAIT = 0.4;
const GAP_VW_PORTRAIT = 0.04;
const FOCAL_VW = 0.8; // focal length (= sphere radius) ≈ 1365px: ~32° tilt at the screen edge
const FOCAL_MIN_VH = 0.6; // portrait screens: don't let the dome curl too hard top/bottom
const RADIUS_PX = 16;
const VIGNETTE = 0.55;
const FRICTION = 0.92; // velocity kept per frame after release
const DPR_MAX = 2;
const MAX_INSTANCES = 512;

/** Same integer hash as before (and as the reference), so placement is stable. */
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

const expoOut = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

export function createHeroWall(opts: HeroWallOptions): HeroWall | null {
  const { canvas, tiles } = opts;
  const groups = Math.max(1, opts.groups ?? 4);

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  if (!renderer.capabilities.isWebGL2) {
    renderer.dispose();
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  /* ---- scene ----------------------------------------------------------------- */
  const atlasTex = new CanvasTexture(document.createElement('canvas'));
  atlasTex.colorSpace = NoColorSpace; // sRGB bytes pass straight through to the screen
  atlasTex.minFilter = LinearFilter;
  atlasTex.magFilter = LinearFilter;
  atlasTex.generateMipmaps = false;
  atlasTex.wrapS = atlasTex.wrapT = ClampToEdgeWrapping;
  atlasTex.flipY = false;

  const u = {
    uAtlas: { value: atlasTex },
    uAtlasCols: { value: 1 },
    uAtlasRows: { value: 1 },
    uRadius: { value: 0.05 },
    uDim: { value: 1 },
    uVignette: { value: VIGNETTE },
    uResolution: { value: [1, 1] as [number, number] },
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
  const geometry = new PlaneGeometry(1, 1);
  const aIndex = new InstancedBufferAttribute(new Float32Array(MAX_INSTANCES), 1);
  const aAlpha = new InstancedBufferAttribute(new Float32Array(MAX_INSTANCES), 1);
  const aScale = new InstancedBufferAttribute(new Float32Array(MAX_INSTANCES), 1);
  geometry.setAttribute('aIndex', aIndex);
  geometry.setAttribute('aAlpha', aAlpha);
  geometry.setAttribute('aScale', aScale);
  const mesh = new InstancedMesh(geometry, material, MAX_INSTANCES);
  mesh.frustumCulled = false;
  const scene = new Scene();
  scene.add(mesh);
  const camera = new PerspectiveCamera(40, 1, 1, 20000);
  const dummy = new Object3D();
  const tmpMat = new Matrix4();

  /* ---- state (CSS px) ------------------------------------------------------ */
  const size = { w: 1, h: 1, dpr: 1, tile: 300, gap: 30, focal: 1000 };
  const grid = { x: 0, y: 0 }; // grid offset: the lattice point under the screen centre
  const vel = { x: 0, y: 0 };
  const state = { progress: 0, dragging: false, moved: false, running: false, visible: true, revealT: -1 };
  const home = { x: 0, y: 0 }; // offset used during the dolly: grid eased onto the nearest tile
  const cells: { col: number; row: number }[] = []; // instance → lattice cell, rebuilt each frame
  let last = { x: 0, y: 0, t: 0 };

  const pitch = () => size.tile + size.gap;

  function layout() {
    size.w = canvas.clientWidth || 1;
    size.h = canvas.clientHeight || 1;
    size.dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    const portrait = size.w / size.h < 0.8;
    const prev = pitch();
    size.tile = Math.round(size.w * (portrait ? TILE_VW_PORTRAIT : TILE_VW));
    size.gap = Math.round(size.w * (portrait ? GAP_VW_PORTRAIT : GAP_VW));
    size.focal = Math.max(size.w * FOCAL_VW, size.h * FOCAL_MIN_VH);
    if (prev !== pitch()) {
      const ratio = pitch() / prev;
      grid.x *= ratio;
      grid.y *= ratio;
    }
    renderer.setPixelRatio(size.dpr);
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.w / size.h;
    camera.fov = (2 * Math.atan(size.h / 2 / size.focal) * 180) / Math.PI;
    camera.updateProjectionMatrix();
    u.uResolution.value = [size.w * size.dpr, size.h * size.dpr];
    u.uRadius.value = RADIUS_PX / size.tile;
  }

  /** Grid offset that puts the centre of the nearest cell exactly under the screen centre. */
  function nearestTileOffset() {
    const c = pitch();
    return { x: Math.round(grid.x / c) * c, y: Math.round(grid.y / c) * c };
  }

  /** Image index for a lattice cell: project = (col + 2·row) mod groups, variant hashed. */
  function tileIndex(col: number, row: number) {
    const count = tiles.length;
    const variants = Math.max(1, Math.floor(count / groups));
    const group = (((col + 2 * row) % groups) + groups) % groups;
    const variant = hashCell(col, row, 7) % variants;
    return Math.min(group + groups * variant, count - 1);
  }

  function applyProgress() {
    const p = state.progress;
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
    // dolly: the camera flies towards the centre tile until it overfills the viewport
    const dEnd = (size.focal * size.tile) / (Math.max(size.w, size.h) * 1.1);
    camera.position.z = -e * (size.focal - dEnd);
    u.uDim.value = 1 - Math.max(0, (p - 0.78) / 0.22);
    if (p > 0 && !state.dragging) {
      const snap = nearestTileOffset();
      const k = Math.min(1, p / 0.35);
      home.x = grid.x + (snap.x - grid.x) * k;
      home.y = grid.y + (snap.y - grid.y) * k;
    }
  }

  /** Places every tile that can be on screen for the current offset. */
  function placeTiles(ox: number, oy: number) {
    const c = pitch();
    const R = size.focal;
    // lattice span that reaches the screen edges (angles of the edge rays) + one tile of slack
    const spanX = R * Math.atan(size.w / 2 / R) + size.tile;
    const spanY = R * Math.atan(size.h / 2 / R) + size.tile;
    const colMin = Math.floor((ox - spanX) / c);
    const colMax = Math.ceil((ox + spanX) / c);
    const rowMin = Math.floor((oy - spanY) / c);
    const rowMax = Math.ceil((oy + spanY) / c);
    const index = aIndex.array as Float32Array;
    const alpha = aAlpha.array as Float32Array;
    const scl = aScale.array as Float32Array;
    let n = 0;
    cells.length = 0;
    for (let row = rowMin; row <= rowMax && n < MAX_INSTANCES; row++) {
      for (let col = colMin; col <= colMax && n < MAX_INSTANCES; col++) {
        const ux = col * c - ox; // px from the screen centre, on the (flat) lattice
        const uy = row * c - oy;
        // rotateY(+θ) sends (0,0,−R) to −x, and rotateX(+φ) sends it to +y, so both
        // angles are negated to put screen-right / screen-down tiles where they belong
        const theta = -ux / R; // yaw
        const phi = -uy / R; // pitch
        // rotateY(θ) · rotateX(φ) · translateZ(−R): on the inside of the sphere, facing the camera
        dummy.rotation.set(phi, theta, 0, 'YXZ');
        dummy.position.set(0, 0, 0);
        dummy.updateMatrix();
        tmpMat.makeTranslation(0, 0, -R);
        dummy.matrix.multiply(tmpMat);
        tmpMat.makeScale(size.tile, size.tile, 1);
        dummy.matrix.multiply(tmpMat);
        mesh.setMatrixAt(n, dummy.matrix);
        index[n] = tileIndex(col, row);
        // centre-out reveal by distance in cells (expo.out, staggered .075s per cell)
        const dist = Math.hypot(ux, uy) / c;
        const t = state.revealT < 0 ? 0 : Math.min(1, Math.max(0, (state.revealT - Math.min(dist, 7) * 0.075) / 1.15));
        const ee = expoOut(t);
        alpha[n] = ee;
        scl[n] = 0.6 + 0.4 * ee;
        cells.push({ col, row });
        n++;
      }
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    aIndex.needsUpdate = true;
    aAlpha.needsUpdate = true;
    aScale.needsUpdate = true;
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
        const keep = Math.pow(FRICTION, dt * 60);
        vel.x *= keep;
        vel.y *= keep;
        if (state.progress > 0) applyProgress();
      } else {
        vel.x = vel.y = 0;
      }
    }
    const useHome = state.progress > 0 && !state.dragging;
    placeTiles(useHome ? home.x : grid.x, useHome ? home.y : grid.y);
    renderer.render(scene, camera);
  }

  /* ---- hit test --------------------------------------------------------------- */
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  function hitTest(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(mesh, false);
    const id = hits[0]?.instanceId;
    if (id == null || !cells[id]) return null;
    const idx = tileIndex(cells[id].col, cells[id].row);
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
  grid.x = 0;
  grid.y = 0;

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
  const atlasReady = buildAtlas(tiles).then(({ canvas: c, cols, rows }) => {
    atlasTex.image = c;
    atlasTex.needsUpdate = true;
    u.uAtlasCols.value = cols;
    u.uAtlasRows.value = rows;
    opts.onReady?.();
  });

  const api: HeroWall = {
    ready: atlasReady,
    reveal(delay = 0) {
      const total = 7 * 0.075 + 1.15;
      return gsap.fromTo(state, { revealT: 0 }, { revealT: total, duration: total, ease: 'none', delay });
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
