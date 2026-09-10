import * as THREE from 'three';

// A "look around from inside a sphere" gallery: panels are distributed evenly
// over a sphere (Fibonacci/golden-spiral distribution) facing the center.
// Drag rotates the camera's look direction with a lerped, lenis-style trailing
// ease plus momentum after release. Click (vs. drag) raycasts into the panels
// and reports the hit project's slug via onSelect. Panels are procedurally
// generated gradient textures — never sourced or scraped imagery.
const GRADIENT_PAIRS = [
  ['#8a8fff', '#f2b880'],
  ['#f2b880', '#f28a8a'],
  ['#6a6aff', '#2ee6b8'],
  ['#2ee6b8', '#3a3a55'],
  ['#f28a8a', '#8a8fff'],
  ['#d9baff', '#6a6aff'],
];

function makeGradientTexture(colorA, colorB, label) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, colorA);
  grad.addColorStop(1, colorB);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  if (label) {
    ctx.fillStyle = 'rgba(11,11,15,0.55)';
    ctx.fillRect(0, size - 96, size, 96);
    ctx.fillStyle = '#f5f5f2';
    ctx.font = '600 34px "Bricolage Grotesque", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.slice(0, 22), 24, size - 48);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createHeroScene(canvas, projects = [], onSelect = () => {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 100);
  camera.position.set(0, 0, 0);
  camera.rotation.order = 'YXZ';

  const RADIUS = 5.5;
  const COUNT = 44;
  const geometries = [];
  const materials = [];
  const textures = [];
  const meshes = [];
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < COUNT; i++) {
    const project = projects.length ? projects[i % projects.length] : null;
    const [colorA, colorB] = GRADIENT_PAIRS[i % GRADIENT_PAIRS.length];
    const texture = makeGradientTexture(colorA, colorB, project ? project.title : null);
    const wide = i % 4 === 0;
    const w = wide ? 1.8 : 1.25;
    const h = wide ? 1.15 : 1.7;
    const geometry = new THREE.PlaneGeometry(w, h);
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);

    const y = 1 - (i / (COUNT - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    mesh.position.set(
      Math.cos(theta) * radiusAtY * RADIUS,
      y * RADIUS,
      Math.sin(theta) * radiusAtY * RADIUS
    );
    mesh.lookAt(0, 0, 0);
    mesh.userData.slug = project ? project.slug : null;

    scene.add(mesh);
    meshes.push(mesh);
    geometries.push(geometry);
    materials.push(material);
    textures.push(texture);
  }

  const raycaster = new THREE.Raycaster();
  const state = {
    dragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    dragDist: 0,
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    targetPitch: 0,
    velYaw: 0,
    velPitch: 0,
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

  function clampPitch(p) {
    return Math.max(-1.1, Math.min(1.1, p));
  }

  function onPointerDown(e) {
    state.dragging = true;
    state.dragDist = 0;
    state.startX = state.lastX = e.clientX;
    state.startY = state.lastY = e.clientY;
    state.velYaw = 0;
    state.velPitch = 0;
    canvas.style.cursor = 'grabbing';
  }

  function onPointerMove(e) {
    if (!state.dragging) return;
    const dx = e.clientX - state.lastX;
    const dy = e.clientY - state.lastY;
    state.lastX = e.clientX;
    state.lastY = e.clientY;
    state.dragDist += Math.abs(dx) + Math.abs(dy);
    const sens = 0.0035;
    state.velYaw = dx * sens;
    state.velPitch = dy * sens;
    state.targetYaw -= state.velYaw;
    state.targetPitch = clampPitch(state.targetPitch - state.velPitch);
  }

  function handleClick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length) {
      const slug = hits[0].object.userData.slug;
      if (slug) onSelect(slug);
    }
  }

  function onPointerUp(e) {
    if (!state.dragging) return;
    state.dragging = false;
    canvas.style.cursor = 'grab';
    if (state.dragDist < 6) handleClick(e.clientX, e.clientY);
  }

  const clock = new THREE.Clock();
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';

  function tick() {
    if (destroyed) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!state.dragging) {
      // Momentum decay, then settle — the "lenis" trailing feel.
      state.velYaw *= 0.92;
      state.velPitch *= 0.92;
      state.targetYaw -= state.velYaw * 0.4;
      state.targetPitch = clampPitch(state.targetPitch - state.velPitch * 0.4);
      state.targetYaw -= 0.015 * dt; // gentle idle drift
    }
    state.yaw += (state.targetYaw - state.yaw) * Math.min(1, dt * 6);
    state.pitch += (state.targetPitch - state.pitch) * Math.min(1, dt * 6);
    camera.rotation.y = state.yaw;
    camera.rotation.x = state.pitch;

    renderer.render(scene, camera);
    frameId = requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  tick();

  return {
    dispose() {
      destroyed = true;
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
    },
  };
}
