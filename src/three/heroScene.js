import * as THREE from 'three';

// Sphere-interior gallery. The camera sits at the origin; project panels are
// curved patches of the sphere surface around it. Drag to look around with a
// trailing (lenis-style) lerp + inertia. The panel nearest the view centre is
// "focused": full colour and slightly scaled, everything else grayscale + dim.

const PALETTES = [
  ['#8a8fff', '#f2b880'],
  ['#f2b880', '#f28a8a'],
  ['#6a6aff', '#2ee6b8'],
  ['#2ee6b8', '#3a3a55'],
  ['#f28a8a', '#8a8fff'],
  ['#d9baff', '#6a6aff'],
  ['#c2f26a', '#2a4a3a'],
  ['#f2d06a', '#8a3a2a'],
];

function makeTexture(colorA, colorB, seed) {
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
  // A few soft procedural shapes so panels read as "images", not flat fills.
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 5; i++) {
    const r = 60 + rnd() * 180;
    const g = ctx.createRadialGradient(rnd() * size, rnd() * size, 0, size / 2, size / 2, r);
    g.addColorStop(0, `rgba(255,255,255,${0.12 + rnd() * 0.2})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(rnd() * size, rnd() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, size * (0.55 + rnd() * 0.3), size, size * 0.12);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const frag = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uFocus;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uTex, vec2(1.0 - vUv.x, vUv.y));
    float g = dot(c.rgb, vec3(0.299, 0.587, 0.114));
    vec3 gray = vec3(g) * 0.55;
    vec3 col = mix(gray, c.rgb, uFocus);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function avgColor(a, b) {
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  return `rgb(${Math.round(((ca.r + cb.r) / 2) * 255)},${Math.round(((ca.g + cb.g) / 2) * 255)},${Math.round(((ca.b + cb.b) / 2) * 255)})`;
}

export function createHeroScene(canvas, projects = [], hooks = {}) {
  const { onSelect = () => {}, onFocus = () => {}, onHover = () => {} } = hooks;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.05, 50);
  camera.rotation.order = 'YXZ';

  const R = 6;
  const meshes = [];
  const disposables = [];

  // Layout: latitude bands, each with a ring of panels, offset per band so
  // panels stagger rather than align in columns.
  const bands = [
    { lat: 1.05, count: 9, w: 0.34, h: 0.2 },
    { lat: 0.62, count: 13, w: 0.27, h: 0.28 },
    { lat: 0.22, count: 17, w: 0.23, h: 0.26 },
    { lat: -0.22, count: 17, w: 0.23, h: 0.26 },
    { lat: -0.62, count: 13, w: 0.27, h: 0.28 },
    { lat: -1.05, count: 9, w: 0.34, h: 0.2 },
  ];
  let idx = 0;
  bands.forEach((band, bi) => {
    for (let i = 0; i < band.count; i++) {
      const project = projects.length ? projects[idx % projects.length] : null;
      const [ca, cb] = PALETTES[idx % PALETTES.length];
      const tex = makeTexture(ca, cb, idx + 1);
      const jitter = ((idx * 7919) % 100) / 100 - 0.5;
      const lon = (i / band.count) * Math.PI * 2 + bi * 0.37 + jitter * 0.12;
      const lat = band.lat + jitter * 0.1;
      const w = band.w * (0.85 + ((idx * 31) % 10) / 30);
      const h = band.h * (0.85 + ((idx * 17) % 10) / 30);
      // Patch of the sphere: phi = longitude, theta = polar angle from +Y.
      const theta0 = Math.PI / 2 - lat - h / 2;
      const geo = new THREE.SphereGeometry(R, 24, 16, lon - w / 2, w, theta0, h);
      const mat = new THREE.ShaderMaterial({
        uniforms: { uTex: { value: tex }, uFocus: { value: 0 } },
        vertexShader: vert,
        fragmentShader: frag,
        side: THREE.BackSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      // Centre direction for focus tests.
      const cTheta = theta0 + h / 2;
      mesh.userData = {
        project,
        tint: avgColor(ca, cb),
        dir: new THREE.Vector3(
          -Math.cos(lon) * Math.sin(cTheta),
          Math.cos(cTheta),
          Math.sin(lon) * Math.sin(cTheta)
        ).normalize(),
        focus: 0,
      };
      // SphereGeometry places phi=0 at -X; keep dir consistent with that.
      scene.add(mesh);
      meshes.push(mesh);
      disposables.push(geo, mat, tex);
      idx++;
    }
  });

  const raycaster = new THREE.Raycaster();
  const st = {
    dragging: false, lastX: 0, lastY: 0, dist: 0,
    yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, vYaw: 0, vPitch: 0,
    focused: null, hovered: null, idle: 0,
  };
  let frame = null;
  let dead = false;
  const fwd = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  const proj = new THREE.Vector3();

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    // Widen the view on narrow/portrait viewports so panels keep a similar on-screen size.
    camera.fov = camera.aspect >= 1.4 ? 52 : camera.aspect >= 1 ? 62 : 80;
    camera.updateProjectionMatrix();
  }
  const clampP = (p) => Math.max(-0.75, Math.min(0.75, p));

  function pick(x, y) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    return hit ? hit.object : null;
  }

  function onDown(e) {
    st.dragging = true; st.dist = 0; st.lastX = e.clientX; st.lastY = e.clientY;
    st.vYaw = 0; st.vPitch = 0; st.idle = 0;
    canvas.style.cursor = 'grabbing';
  }
  function onMove(e) {
    if (st.dragging) {
      const dx = e.clientX - st.lastX; const dy = e.clientY - st.lastY;
      st.lastX = e.clientX; st.lastY = e.clientY;
      st.dist += Math.abs(dx) + Math.abs(dy);
      const s = 0.0032;
      st.vYaw = dx * s; st.vPitch = dy * s;
      st.tYaw -= st.vYaw;
      st.tPitch = clampP(st.tPitch - st.vPitch);
      if (st.hovered) { st.hovered = null; onHover(null); }
      return;
    }
    const m = pick(e.clientX, e.clientY);
    const h = m && m === st.focused ? m : null;
    if (h !== st.hovered) {
      st.hovered = h;
      canvas.style.cursor = h ? 'pointer' : 'grab';
      onHover(h ? h.userData.project : null);
    }
  }
  function onUp(e) {
    if (!st.dragging) return;
    st.dragging = false; st.idle = 0;
    canvas.style.cursor = 'grab';
    if (st.dist < 6) {
      const m = pick(e.clientX, e.clientY);
      if (m && m.userData.project) onSelect(m.userData.project.slug);
    }
  }

  const clock = new THREE.Clock();
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';

  function tick() {
    if (dead) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!st.dragging) {
      st.vYaw *= 0.93; st.vPitch *= 0.93;
      st.tYaw -= st.vYaw * 0.5;
      st.tPitch = clampP(st.tPitch - st.vPitch * 0.5);
      st.idle += dt;
      if (st.idle > 2.5) st.tYaw -= 0.02 * dt; // gentle drift when idle
    }
    const k = 1 - Math.exp(-dt * 5.5);
    st.yaw += (st.tYaw - st.yaw) * k;
    st.pitch += (st.tPitch - st.pitch) * k;
    camera.rotation.set(st.pitch, st.yaw, 0);

    // Focus: closest panel to the view direction within a cone.
    camera.getWorldDirection(fwd);
    let best = null; let bestDot = Math.cos(0.3);
    for (const m of meshes) {
      const d = m.userData.dir.dot(fwd);
      if (d > bestDot) { bestDot = d; best = m; }
    }
    if (best !== st.focused) {
      st.focused = best;
      if (st.hovered && st.hovered !== best) { st.hovered = null; onHover(null); canvas.style.cursor = 'grab'; }
      let y = null;
      if (best) {
        proj.copy(best.userData.dir).multiplyScalar(R).project(camera);
        y = (1 - proj.y) / 2;
      }
      onFocus(best ? best.userData.project : null, best ? best.userData.tint : null, y);
    } else if (best) {
      proj.copy(best.userData.dir).multiplyScalar(R).project(camera);
      onFocus(best.userData.project, best.userData.tint, (1 - proj.y) / 2, true);
    }
    for (const m of meshes) {
      const target = m === best ? 1 : 0;
      m.userData.focus += (target - m.userData.focus) * Math.min(1, dt * 7);
      m.material.uniforms.uFocus.value = m.userData.focus;
      const sc = 1 - m.userData.focus * 0.06; // pull focused panel slightly toward camera
      m.scale.setScalar(sc);
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  tick();

  return {
    dispose() {
      dead = true;
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
