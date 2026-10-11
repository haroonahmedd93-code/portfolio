/**
 * Hero wall — the "inverted dome" of project tiles.
 *
 * Tiles sit on the inside of a sphere (radius R) and face its centre. The camera
 * sits *behind* the centre, so the wall curves towards the viewer like a bowl:
 * side columns and top/bottom rows tilt inwards (the look in 00-overview / the
 * reference recording). Drag rotates the dome with inertia; scroll dollies the
 * camera into the front tile. See 03-webgl.md for the original's uniforms
 * (uCell, uR, uPersp, uCamZ, uZoom, uDrag, uReveal) — same ideas, own code.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  Object3D,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  WebGLRenderer,
  Group,
  MathUtils,
  Vector3,
} from 'three';
import { gsap, InertiaPlugin } from '../../core/gsap';
import { coarsePointer } from '../../core/rm';
import { fragmentShader, vertexShader } from './tile.glsl';

export interface HeroWallOptions {
  canvas: HTMLCanvasElement;
  tiles: string[]; // image urls, reused around the ring
  cols?: number; // tiles around the full ring
  rows?: number;
  onReady?: () => void;
}

export interface HeroWall {
  /** Reveal tiles from the centre out (H4). Returns the timeline. */
  reveal(): gsap.core.Timeline;
  /** 0 → 1 scroll progress: camera dolly into the front tile (H5). */
  setProgress(p: number): void;
  start(): void;
  stop(): void;
  destroy(): void;
}

const R = 10;
const CAM_Z_START = 2.6; // behind the sphere centre → bowl look
const CAM_Z_END = -R + 0.9; // right in front of the front tile
const H_FOV = 72; // horizontal field of view in degrees (desktop) → 4 columns of 18°
const MAX_PITCH = MathUtils.degToRad(13);

export function createHeroWall(opts: HeroWallOptions): HeroWall | null {
  const { canvas, tiles } = opts;
  const COLS = opts.cols ?? 20;
  const ROWS = opts.rows ?? 7; // odd → the camera dollies into a tile, not a gap; 7 fills portrait screens
  const COL_STEP = (Math.PI * 2) / COLS; // 18° at 20 cols → ~4.7 columns across at 86° hfov
  const ROW_STEP = COL_STEP; // square cells
  const TILE_ANGLE = COL_STEP * 0.89; // ~11% gap, as in the reference
  const TILE = 2 * R * Math.sin(TILE_ANGLE / 2);

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, 0.1, 60);
  camera.position.set(0, 0, CAM_Z_START);
  const lookTarget = new Vector3(0, 0, -R);
  camera.lookAt(lookTarget);

  const dome = new Group();
  scene.add(dome);

  /* ---- textures --------------------------------------------------------- */
  const loader = new TextureLoader();
  const textures: Texture[] = tiles.map((url) => {
    const t = loader.load(url, () => (t.needsUpdate = true));
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return t;
  });

  /* ---- tiles: one merged geometry, one draw call per texture ------------- */
  const shared = {
    uRevealT: { value: -1 },
    uRadius: { value: 0.07 },
    uDim: { value: 1 },
  };
  const materials = textures.map(
    (t) =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: { uMap: { value: t }, ...shared },
      }),
  );

  const count = COLS * ROWS;
  const centers = new Float32Array(count * 4 * 3);
  const rights = new Float32Array(count * 4 * 3);
  const ups = new Float32Array(count * 4 * 3);
  const locals = new Float32Array(count * 4 * 2);
  const delays = new Float32Array(count * 4);
  const positions = new Float32Array(count * 4 * 3); // unused by the shader, keeps bounding sphere sane
  const indices: number[] = [];
  const order: { tex: number; tile: number }[] = [];

  const helper = new Object3D();
  const right = new Vector3();
  const up = new Vector3();
  let tile = 0;
  for (let j = 0; j < ROWS; j++) {
    const phi = (j - (ROWS - 1) / 2) * ROW_STEP;
    for (let i = 0; i < COLS; i++, tile++) {
      const theta = i * COL_STEP + ((j - (ROWS - 1) / 2) % 2 ? COL_STEP / 2 : 0); // brick offset; centre row stays on axis
      helper.position.set(R * Math.cos(phi) * Math.sin(theta), R * Math.sin(phi), -R * Math.cos(phi) * Math.cos(theta));
      helper.lookAt(0, 0, 0);
      helper.updateMatrix();
      right.set(TILE / 2, 0, 0).applyQuaternion(helper.quaternion);
      up.set(0, TILE / 2, 0).applyQuaternion(helper.quaternion);
      const dTheta = Math.atan2(Math.sin(theta), Math.cos(theta)); // wrap to [-π, π]
      const dist = Math.hypot(dTheta / COL_STEP, phi / ROW_STEP);
      const delay = Math.min(dist, 7) * 0.075;
      for (let v = 0; v < 4; v++) {
        const k = tile * 4 + v;
        const lx = v % 2 ? 1 : -1;
        const ly = v < 2 ? -1 : 1;
        centers.set([helper.position.x, helper.position.y, helper.position.z], k * 3);
        rights.set([right.x, right.y, right.z], k * 3);
        ups.set([up.x, up.y, up.z], k * 3);
        locals.set([lx, ly], k * 2);
        delays[k] = delay;
        positions.set(
          [helper.position.x + right.x * lx + up.x * ly, helper.position.y + right.y * lx + up.y * ly, helper.position.z + right.z * lx + up.z * ly],
          k * 3,
        );
      }
      order.push({ tex: (i + j * 5) % textures.length, tile });
    }
  }
  // group triangles by texture so each material draws once
  order.sort((a, b) => a.tex - b.tex);
  const geometry = new BufferGeometry();
  let cursor = 0;
  for (let t = 0; t < textures.length; t++) {
    const startIdx = cursor;
    for (const o of order) {
      if (o.tex !== t) continue;
      const b = o.tile * 4;
      indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      cursor += 6;
    }
    geometry.addGroup(startIdx, cursor - startIdx, t);
  }
  geometry.setIndex(indices);
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aCenter', new BufferAttribute(centers, 3));
  geometry.setAttribute('aRight', new BufferAttribute(rights, 3));
  geometry.setAttribute('aUp', new BufferAttribute(ups, 3));
  geometry.setAttribute('aLocal', new BufferAttribute(locals, 2));
  geometry.setAttribute('aDelay', new BufferAttribute(delays, 1));
  geometry.computeBoundingSphere();
  const mesh = new Mesh(geometry, materials);
  mesh.frustumCulled = false;
  dome.add(mesh);

  /* ---- state -------------------------------------------------------------- */
  const state = { yaw: 0, pitch: 0, progress: 0, dragging: false, running: false, idle: 0 };
  InertiaPlugin.track(state, 'yaw,pitch');

  function layout() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75); // tiles are soft-edged anyway; saves fill rate on retina
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the horizontal field of view constant so ~5 columns show on desktop
    const portrait = camera.aspect < 0.8;
    const hfov = portrait ? 40 : camera.aspect < 1.3 ? 62 : H_FOV;
    lookTarget.y = portrait ? R * 0.16 : 0; // on phones the wall sits above the type block
    const vfov = 2 * Math.atan(Math.tan(MathUtils.degToRad(hfov) / 2) / camera.aspect);
    camera.fov = MathUtils.radToDeg(vfov);
    camera.updateProjectionMatrix();
  }

  function applyProgress() {
    const p = state.progress;
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOutQuad
    camera.position.z = MathUtils.lerp(CAM_Z_START, CAM_Z_END, e);
    camera.lookAt(lookTarget);
    shared.uDim.value = 1 - Math.max(0, (p - 0.78) / 0.22); // darken into the manifesto
  }

  function render() {
    if (!state.dragging) state.idle += 0.016;
    dome.rotation.y = state.yaw + Math.sin(state.idle * 0.35) * 0.012; // slow breathing
    dome.rotation.x = state.pitch;
    renderer.render(scene, camera);
  }

  /* ---- drag (H6) ----------------------------------------------------------- */
  let lastX = 0;
  let lastY = 0;
  let inertia: gsap.core.Tween | null = null;
  const yawPerPx = () => 0.0032 * (1000 / Math.max(600, canvas.clientWidth)); // feel constant across widths

  function onDown(e: PointerEvent) {
    if (e.button !== 0) return;
    inertia?.kill();
    state.dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
  }
  function onMove(e: PointerEvent) {
    if (!state.dragging) return;
    const k = yawPerPx();
    state.yaw += (e.clientX - lastX) * k;
    if (!coarsePointer) state.pitch = MathUtils.clamp(state.pitch - (e.clientY - lastY) * k * 0.6, -MAX_PITCH, MAX_PITCH);
    lastX = e.clientX;
    lastY = e.clientY;
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
    inertia = gsap.to(state, {
      inertia: {
        yaw: { velocity: 'auto' },
        pitch: { velocity: 'auto', min: -MAX_PITCH, max: MAX_PITCH },
        resistance: 420,
      },
    });
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);

  /* ---- loop + visibility ---------------------------------------------------- */
  const tick = () => render();
  const ro = new ResizeObserver(layout);
  ro.observe(canvas);
  layout();

  let visible = true;
  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (state.running) visible ? gsap.ticker.add(tick) : gsap.ticker.remove(tick);
    },
    { threshold: 0 },
  );
  io.observe(canvas);

  const onVis = () => {
    if (!state.running) return;
    document.hidden ? gsap.ticker.remove(tick) : visible && gsap.ticker.add(tick);
  };
  document.addEventListener('visibilitychange', onVis);

  const api: HeroWall = {
    reveal() {
      // the shader eases each tile from its own delay; we only advance the clock
      const total = 7 * 0.075 + 1.15;
      return gsap.timeline().fromTo(shared.uRevealT, { value: 0 }, { value: total, duration: total, ease: 'none' });
    },
    setProgress(p) {
      state.progress = MathUtils.clamp(p, 0, 1);
      applyProgress();
    },
    start() {
      if (state.running) return;
      state.running = true;
      applyProgress();
      if (visible) gsap.ticker.add(tick);
      opts.onReady?.();
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
      for (const m of materials) m.dispose();
      geometry.dispose();
      for (const t of textures) t.dispose();
      renderer.dispose();
    },
  };
  return api;
}
