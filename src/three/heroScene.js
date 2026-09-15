import * as THREE from 'three';

// Cylinder "twirl" gallery. The camera sits on the axis of a cylinder; project
// panels are curved cylinder segments laid out on a helix. One scroll value `s`
// (in panel units) drives a screw motion: panels rotate around the axis and rise
// at the same time, so each one in turn arrives front-and-centre. Drag (either
// axis), wheel and touch all feed `s` through a trailing lerp + inertia.

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
  const thumb = document.createElement('canvas');
  thumb.width = thumb.height = 24;
  thumb.getContext('2d').drawImage(canvas, 0, 0, 24, 24);
  return { t, thumb: thumb.toDataURL('image/png') };
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
    vec3 gray = vec3(g) * 0.5;
    gl_FragColor = vec4(mix(gray, c.rgb, uFocus), 1.0);
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);

  // Helix layout ---------------------------------------------------------
  // Camera sits behind the cylinder axis so the whole front half is in frame;
  // panels on the far wall face the camera (concave), side panels go edge-on.
  const R = 6;                       // cylinder radius
  const CAM_D = 11.4;                // camera distance behind the axis
  camera.position.set(0, 0, CAM_D);
  const PER_TURN = 6;                // panels per full revolution
  const DA = (Math.PI * 2) / PER_TURN;
  const DY = 3.3;                    // vertical rise per panel
  const COUNT = Math.max(24, projects.length * 8);
  const PANEL_H = 6.6;
  const PANEL_ARC = 0.95;            // radians of cylinder the panel covers

  const meshes = [];
  const disposables = [];
  for (let i = 0; i < COUNT; i++) {
    const project = projects.length ? projects[i % projects.length] : null;
    const [ca, cb] = PALETTES[i % PALETTES.length];
    const { t: tex, thumb } = makeTexture(ca, cb, i + 1);
    const arc = PANEL_ARC * (0.78 + ((i * 31) % 10) / 33);
    const h = PANEL_H * (0.82 + ((i * 17) % 10) / 28);
    // Open cylinder segment centred on theta = PI, i.e. facing the camera at -Z.
    const geo = new THREE.CylinderGeometry(R, R, h, 24, 1, true, Math.PI - arc / 2, arc);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex }, uFocus: { value: 0 } },
      vertexShader: vert,
      fragmentShader: frag,
      side: THREE.BackSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { project, tint: avgColor(ca, cb), thumb, focus: 0, i, idx: 0 };
    scene.add(mesh);
    meshes.push(mesh);
    disposables.push(geo, mat, tex);
  }

  // Interaction state ----------------------------------------------------
  const st = {
    s: 0, tS: 0, v: 0,               // scroll (panel units), target, velocity (units/s)
    dragging: false, lastX: 0, lastY: 0, lastT: 0, dist: 0,
    px: 0, py: 0, pointerMoved: false,
    focused: null, hovered: null, idle: 0, lastLabelY: -1,
  };
  const PX_PER_UNIT_X = 320;         // horizontal px for one panel step
  const PX_PER_UNIT_Y = 260;         // vertical px for one panel step
  const FOLLOW = 8;                  // trailing follow rate while dragging
  const SETTLE = 5;                  // follow rate when coasting
  const FRICTION = 2.4;              // inertia decay per second
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let frame = null;
  let dead = false;

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.fov = camera.aspect >= 1.4 ? 50 : camera.aspect >= 1 ? 58 : 72;
    camera.updateProjectionMatrix();
  }

  function pick(x, y) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    return hit ? hit.object : null;
  }

  function onDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    st.dragging = true; st.dist = 0; st.v = 0; st.idle = 0;
    st.lastX = e.clientX; st.lastY = e.clientY; st.lastT = performance.now();
    canvas.setPointerCapture?.(e.pointerId);
    canvas.style.cursor = 'grabbing';
    if (st.hovered) { st.hovered = null; onHover(null); }
  }
  function onMove(e) {
    st.px = e.clientX; st.py = e.clientY; st.pointerMoved = true;
    if (!st.dragging) return;
    const now = performance.now();
    const dx = e.clientX - st.lastX; const dy = e.clientY - st.lastY;
    const dtMs = Math.max(1, now - st.lastT);
    st.lastX = e.clientX; st.lastY = e.clientY; st.lastT = now;
    st.dist += Math.abs(dx) + Math.abs(dy);
    // Either axis turns the screw: drag left or drag up both advance.
    const d = dx / PX_PER_UNIT_X + dy / PX_PER_UNIT_Y;
    st.tS -= d;
    st.v += ((-d * (1000 / dtMs)) - st.v) * 0.35;
  }
  function onUp(e) {
    if (!st.dragging) return;
    st.dragging = false; st.idle = 0;
    canvas.releasePointerCapture?.(e.pointerId);
    canvas.style.cursor = 'grab';
    if (performance.now() - st.lastT > 80) st.v = 0;
    if (st.dist < 6) {
      const m = pick(e.clientX, e.clientY);
      if (m && m.userData.project) onSelect(m.userData.project.slug);
    }
  }
  function onWheel(e) {
    e.preventDefault();
    st.idle = 0; st.v = 0;
    st.tS += (e.deltaY + e.deltaX) / 700;
  }

  const clock = new THREE.Clock();
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';
  const wrap = (x) => x - Math.round(x / COUNT) * COUNT;

  function tick() {
    if (dead) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!st.dragging) {
      st.tS += st.v * dt;
      st.v *= Math.exp(-FRICTION * dt);
      if (Math.abs(st.v) < 1e-3) {
        st.v = 0;
        // Ease onto the nearest panel once momentum has died.
        const snap = Math.round(st.tS);
        st.tS += (snap - st.tS) * Math.min(1, dt * 3);
      }
      st.idle += dt;
      if (st.idle > 4) st.tS += 0.04 * dt; // slow idle twirl
    }
    st.s += (st.tS - st.s) * (1 - Math.exp(-dt * (st.dragging ? FOLLOW : SETTLE)));

    // Place panels on the helix relative to the scroll position.
    let best = null; let bestD = 0.5;
    for (const m of meshes) {
      const idx = wrap(m.userData.i - st.s);
      m.userData.idx = idx;
      m.rotation.y = -idx * DA;
      m.position.y = -idx * DY;
      const d = Math.abs(idx);
      if (d < bestD) { bestD = d; best = m; }
    }

    if (best !== st.focused) {
      st.focused = best;
      onFocus(best ? best.userData.project : null, best ? best.userData : null);
    }

    if (st.pointerMoved && !st.dragging) {
      st.pointerMoved = false;
      const m = pick(st.px, st.py);
      const h = m && m === best ? m : null;
      if (h !== st.hovered) {
        st.hovered = h;
        canvas.style.cursor = h ? 'pointer' : 'grab';
        onHover(h ? h.userData.project : null);
      }
    }
    for (const m of meshes) {
      const target = m === best ? 1 : 0;
      const f = m.userData.focus += (target - m.userData.focus) * Math.min(1, dt * 7);
      m.material.uniforms.uFocus.value = f;
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('dragstart', (e) => e.preventDefault());
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
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
      canvas.removeEventListener('wheel', onWheel);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
