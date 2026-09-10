import * as THREE from 'three';

// A draggable "drum" of curved gradient panels arranged in a circle around the
// viewer — an original take on the classic WebGL cylindrical-gallery technique
// (drag/spin a ring of cards). Panels are procedurally generated gradients,
// never sourced or scraped imagery. Fully torn down via dispose().
const GRADIENT_PAIRS = [
  ['#8a8fff', '#f2b880'],
  ['#f2b880', '#f28a8a'],
  ['#6a6aff', '#2ee6b8'],
  ['#2ee6b8', '#3a3a55'],
  ['#f28a8a', '#8a8fff'],
  ['#d9baff', '#6a6aff'],
];

function makeGradientTexture(colorA, colorB, angleDeg = 135) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rad = (angleDeg * Math.PI) / 180;
  const x0 = size / 2 - (Math.cos(rad) * size) / 2;
  const y0 = size / 2 - (Math.sin(rad) * size) / 2;
  const x1 = size / 2 + (Math.cos(rad) * size) / 2;
  const y1 = size / 2 + (Math.sin(rad) * size) / 2;
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  grad.addColorStop(0, colorA);
  grad.addColorStop(1, colorB);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Bends a plane's vertices along an arc so each panel reads as a curved
// surface, like a strip cut from the wall of a cylinder.
function buildCurvedPanelGeometry(width, height, bendRadians) {
  const segments = 24;
  const geometry = new THREE.PlaneGeometry(width, height, segments, 1);
  const pos = geometry.attributes.position;
  const bendRadius = width / bendRadians;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const theta = (x / (width / 2)) * (bendRadians / 2);
    const newX = bendRadius * Math.sin(theta);
    const newZ = bendRadius * (Math.cos(theta) - 1);
    pos.setX(i, newX);
    pos.setZ(i, newZ);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export function createHeroScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
  camera.position.set(0, 0, 0);

  const drum = new THREE.Group();
  scene.add(drum);

  const RADIUS = 9.5;
  const PANEL_COUNT = 18;
  const geometries = [];
  const materials = [];
  const textures = [];

  for (let i = 0; i < PANEL_COUNT; i++) {
    const angle = (i / PANEL_COUNT) * Math.PI * 2;
    const wide = i % 3 === 0;
    const panelWidth = wide ? 2.1 : 1.5;
    const panelHeight = wide ? 1.4 : 2.1;
    const [colorA, colorB] = GRADIENT_PAIRS[i % GRADIENT_PAIRS.length];
    const texture = makeGradientTexture(colorA, colorB);
    const geometry = buildCurvedPanelGeometry(panelWidth, panelHeight, 0.35);
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
    const mesh = new THREE.Mesh(geometry, material);

    // Deterministic pseudo-random vertical scatter (golden-angle spacing avoids
    // any two panels lining up) so the drum reads as organically arranged.
    const yOffset = Math.sin(i * 2.399963) * 3.4;
    const radiusJitter = (Math.cos(i * 1.732) * 0.5) * 0.6;
    const r = RADIUS + radiusJitter;

    mesh.position.set(Math.sin(angle) * r, yOffset, -Math.cos(angle) * r);
    mesh.rotation.y = angle;

    drum.add(mesh);
    geometries.push(geometry);
    materials.push(material);
    textures.push(texture);
  }

  const state = {
    dragging: false,
    lastX: 0,
    velocity: 0,
    rotation: 0,
    idleSpin: 0.035,
  };
  let frameId = null;
  let destroyed = false;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function onPointerDown(e) {
    state.dragging = true;
    state.lastX = e.clientX;
    state.velocity = 0;
    canvas.style.cursor = 'grabbing';
  }

  function onPointerMove(e) {
    if (!state.dragging) return;
    const dx = e.clientX - state.lastX;
    state.lastX = e.clientX;
    const delta = dx * 0.0045;
    state.rotation += delta;
    state.velocity = delta;
  }

  function endDrag() {
    state.dragging = false;
    canvas.style.cursor = 'grab';
  }

  function resolveMotion(dt) {
    if (state.dragging) return;
    // Momentum decays smoothly, then a slow idle auto-spin takes over.
    state.velocity *= 0.94;
    if (Math.abs(state.velocity) > 0.00005) {
      state.rotation += state.velocity;
    } else {
      state.rotation += state.idleSpin * dt;
    }
  }

  const clock = new THREE.Clock();
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'pan-y';

  function tick() {
    if (destroyed) return;
    const dt = clock.getDelta();
    resolveMotion(dt);
    drum.rotation.y = state.rotation;
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  tick();

  return {
    dispose() {
      destroyed = true;
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
    },
  };
}
