import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { gsap } from 'gsap';
import Lenis from 'lenis';
import { projects } from './projects.js';

const $ = (s) => document.querySelector(s);
const N = projects.length;
const TURNS = 5;               // helix turns across the full set
const BG = new THREE.Color(0x202123);

/* ---------- placeholder textures (replace with real images via projects.js) ---------- */
function placeholder(p) {
  const c = document.createElement('canvas'); c.width = 1600; c.height = 900;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 1600, 900);
  grad.addColorStop(0, p.color); grad.addColorStop(1, '#141416');
  g.fillStyle = grad; g.fillRect(0, 0, 1600, 900);
  const img = g.getImageData(0, 0, 1600, 900), d = img.data;      // film grain
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 26; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  g.fillStyle = 'rgba(233,231,225,.9)'; g.font = '400 26px "Geist Mono", monospace'; g.textBaseline = 'top';
  const t = p.title.toUpperCase();
  g.fillText(t, 56, 56); g.fillText(p.client.toUpperCase(), 56, 96);
  g.textAlign = 'right'; g.fillText(p.year, 1544, 56); g.fillText(p.type.toUpperCase(), 1544, 96);
  g.textAlign = 'left'; g.fillText(String(projects.indexOf(p) + 1).padStart(2, '0'), 56, 810);
  return c;
}

/* ---------- WebGL sketch ---------- */
class Sketch {
  constructor(dom) {
    this.dom = dom; this.w = dom.offsetWidth; this.h = dom.offsetHeight;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(this.w, this.h); this.renderer.setClearColor(0x181818, 0);
    dom.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, this.w / this.h, .1, 1000);
    this.camera.position.set(0, 0, innerWidth < 768 ? 9 : 5);
    this.mouse = new THREE.Vector2(999, 999); this.mouseStrength = 0;
    this.intro = 0; this.meshes = []; this.mats = [];
    this.pos = 0; this.spacing = .8; this.hSpacing = 1; this.radius = 1;
    this.hovered = null; this.onHover = null;
    this.buildMaterial(); this.buildMeshes(); this.buildPost();
    addEventListener('resize', () => this.resize());
    dom.addEventListener('mousemove', (e) => this.moveMouse(e));
    dom.addEventListener('mouseleave', () => this.leaveMouse());
    this.play = true; this.render();
  }
  buildMaterial() {
    this.material = new THREE.ShaderMaterial({
      side: THREE.DoubleSide, transparent: true,
      uniforms: {
        distanceFromCenter: { value: 0 }, spiralAngle: { value: 0 }, texture1: { value: null },
        uRadius: { value: 1 }, uPlaneAspect: { value: 1.2 }, uTextureAspect: { value: 16 / 9 },
        uDeform: { value: 0 }, opacity: { value: 1 }, uMouseNDC: { value: new THREE.Vector2(999, 999) }, uMouseStrength: { value: 0 },
      },
      vertexShader: /* glsl */`
        uniform float spiralAngle, uRadius, uPlaneAspect, uTextureAspect, uDeform, uMouseStrength;
        uniform vec2 uMouseNDC;
        varying vec2 vUvC; varying float vMouse;
        void main(){
          vec3 pos = position;
          float angle = spiralAngle + pos.x;             // bend the plane around the cylinder
          pos.x = uRadius * sin(angle);
          pos.z = uRadius * cos(angle);
          pos.y = sin(pos.y);                            // soft vertical curvature
          vec2 uv = uv - 0.5;                            // cover-fit the texture
          if (uTextureAspect > uPlaneAspect) uv.x *= uPlaneAspect / uTextureAspect; else uv.y *= uTextureAspect / uPlaneAspect;
          pos.z += sin(position.y * 3.0 + 100.) * uDeform * 0.07;   // velocity wobble
          pos.y += sin(position.x * 3.0) * uDeform * 0.04;
          vec4 proj = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          vec2 ndc = proj.xy / proj.w;
          float d = length(ndc - uMouseNDC);
          float bulge = exp(-d * d * 5.0) * uMouseStrength;         // gaussian bulge toward camera
          pos.z += bulge * 0.5;
          uv /= 1.12;
          vMouse = bulge; vUvC = uv + 0.5;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform float distanceFromCenter, opacity; uniform sampler2D texture1;
        varying vec2 vUvC; varying float vMouse;
        void main(){
          vec2 c = vUvC - 0.5;
          vec4 t = texture2D(texture1, vUvC + c * vMouse * 0.12);
          float bw = (t.r + t.g + t.b) / 9.;
          vec3 tint = vec3(0.125, 0.129, 0.137);
          vec4 mono = vec4(mix(tint, vec3(1.0), bw), 1.0);
          gl_FragColor = mix(mono, t, distanceFromCenter);   // colour only near the front
          gl_FragColor.a = clamp(distanceFromCenter, 0.8, 1.) * opacity;
        }`,
    });
  }
  buildMeshes() {
    const loader = new THREE.TextureLoader();
    projects.forEach((p) => {
      const m = this.material.clone(); this.mats.push(m);
      const setTex = (tex) => { tex.colorSpace = THREE.SRGBColorSpace; m.uniforms.texture1.value = tex; m.uniforms.uTextureAspect.value = tex.image.width / tex.image.height; };
      if (p.image) loader.load(p.image, setTex, undefined, () => setTex(new THREE.CanvasTexture(placeholder(p))));
      else setTex(new THREE.CanvasTexture(placeholder(p)));
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.95, 100, 100), m);
      mesh.userData.slug = p.slug; this.scene.add(mesh); this.meshes.push(mesh);
    });
  }
  buildPost() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.after = new AfterimagePass(); this.after.uniforms.damp.value = 0;
    this.composer.addPass(this.after);
  }
  /* position = fractional index, turns, vertical spacing, angular spacing, radius */
  update(pos = 0, turns = TURNS, spacing = .8, hSpacing = 1, radius = 1) {
    const s = this.intro; this.pos = pos; this.spacing = spacing; this.hSpacing = hSpacing; this.radius = radius;
    const step = 2 * Math.tan(70 * Math.PI / 360) * this.camera.position.z / (N - 1), span = (N - 1) * step;
    this.meshes.forEach((m, c) => {
      let u = ((c - pos) % N + N) % N; if (u > N / 2) u -= N;
      const ang = u / N * Math.PI * 2 * turns * hSpacing, y = -u * spacing;
      m.position.set((c * step - span / 2) * (1 - s), y * s, 0);
      m.material.uniforms.spiralAngle.value = ang * s;
      m.material.uniforms.uRadius.value = radius * s;
      m.material.uniforms.distanceFromCenter.value = s * Math.exp(-u * u);
    });
  }
  introAnimation(done) {
    const t = { p: 0 };
    gsap.to(t, { p: 1, duration: 1.6, ease: 'power3.inOut', onUpdate: () => (this.intro = t.p), onComplete: () => { this.intro = 1; done?.(); } });
  }
  exitAnimation(pos, done) {
    const o = { position: pos, spacing: this.spacing, hSpacing: this.hSpacing, radius: this.radius };
    gsap.to(o, { position: pos + 30, spacing: 10, hSpacing: 3, radius: 1, duration: 1.4, ease: 'expo.in', onUpdate: () => this.update(o.position, TURNS, o.spacing, o.hSpacing, o.radius), onComplete: done });
    this.meshes.forEach((m, i) => gsap.to(m.material.uniforms.opacity, { value: 0, duration: 1, ease: 'power2.in', delay: .03 * i }));
  }
  resetOpacity() { this.meshes.forEach((m) => (m.material.uniforms.opacity.value = 1)); }
  setVelocity(v) { gsap.to(this.after.uniforms.damp, { duration: .5, value: Math.min(Math.abs(v), .9) }); }
  setDeform(v) { this.mats.forEach((m) => (m.uniforms.uDeform.value = v)); }
  /* hit-test: project the bent card's centre + corners and test the mouse against that box */
  meshAt(ndc) {
    const v = new THREE.Vector3(); let best = null, bestZ = -Infinity;
    this.meshes.forEach((m) => {
      const a = m.material.uniforms.spiralAngle.value, r = m.material.uniforms.uRadius.value;
      let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, cz = 0;
      [[-.5, -.975], [.5, -.975], [.5, .975], [-.5, .975], [0, 0]].forEach(([x, y]) => {
        v.set(r * Math.sin(a + x), Math.sin(y) + m.position.y, r * Math.cos(a + x)).project(this.camera);
        if (x === 0) cz = r * Math.cos(a);
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
      });
      if (ndc.x > minX && ndc.x < maxX && ndc.y > minY && ndc.y < maxY && cz > bestZ) { bestZ = cz; best = m; }
    });
    return best;
  }
  ndcOf(e) { const b = this.dom.getBoundingClientRect(); return new THREE.Vector2((e.clientX - b.left) / this.w * 2 - 1, -((e.clientY - b.top) / this.h) * 2 + 1); }
  moveMouse(e) {
    const p = this.ndcOf(e);
    gsap.to(this.mouse, { x: p.x, y: p.y, duration: .6, ease: 'power3.out', overwrite: true });
    gsap.to(this, { mouseStrength: 1, duration: .4, ease: 'power2.out', overwrite: 'auto' });
    const hit = this.meshAt(p)?.userData.slug ?? null;
    if (hit !== this.hovered) { this.hovered = hit; this.onHover?.(hit); }
  }
  leaveMouse() {
    gsap.to(this, { mouseStrength: 0, duration: .6, ease: 'power2.out', overwrite: 'auto' });
    this.hovered = null; this.onHover?.(null);
  }
  resize() {
    this.w = this.dom.offsetWidth; this.h = this.dom.offsetHeight;
    this.renderer.setSize(this.w, this.h); this.composer.setSize(this.w, this.h);
    this.camera.aspect = this.w / this.h; this.camera.updateProjectionMatrix();
    this.camera.position.z = innerWidth < 768 ? 9 : 5;
  }
  render() {
    if (!this.play) return;
    this.mats.forEach((m) => { m.uniforms.uMouseNDC.value.copy(this.mouse); m.uniforms.uMouseStrength.value = this.mouseStrength; });
    this.composer.render();
    requestAnimationFrame(() => this.render());
  }
}

/* ---------- app ---------- */
const container = $('#container'), cursor = $('#cursor'), mid = $('#mid'), list = $('#list'), page = $('#project');
const sketch = new Sketch(container);
const UI = ['#home-ui .name', '#home-ui .status', '#home-ui .clock', mid, '#home-ui .nav', '#home-ui .view', '#home-ui .contact'];
$('#scroll-spacer').style.height = `${N * 100}vh`;
const lenis = new Lenis({ lerp: .1, smoothWheel: true });
let view = 'spiral', busy = false, current = 0, scrollIndex = 0;

/* scroll → spiral position, with smoothed velocity driving radius / deform / afterimage */
let prevY = 0, vel = 0, radius = 2, spacing = .8, hSpacing = 1;
function frame(t) {
  lenis.raf(t);
  if (view === 'spiral' && !busy) {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    vel += ((y - prevY) * .1 - vel) * .1; prevY = y;
    scrollIndex = (max > 0 ? y / max : 0) * N;
    const nearest = ((Math.round(scrollIndex) % N) + N) % N;
    if (nearest !== current) setCurrent(nearest);
    const l = Math.max(0, Math.min(Math.abs(vel) / 3, 2));          // elasticity: faster scroll → wider, looser helix
    radius += (2 + .5 * l - radius) * .15;
    spacing += (.8 - spacing) * .15;
    hSpacing += (1 + .2 * l - hSpacing) * .15;
    sketch.update(scrollIndex, TURNS, spacing, hSpacing, radius);
    sketch.setVelocity(vel);
    sketch.setDeform(Math.max(-1.5, Math.min(1.5, vel)));
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* drag to scroll (pointer), on top of Lenis wheel/touch */
let drag = null;
container.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') { drag = { y: e.clientY, s: lenis.targetScroll, moved: 0 }; container.classList.add('dragging'); } });
addEventListener('pointermove', (e) => { if (!drag) return; const d = drag.y - e.clientY; drag.moved += Math.abs(e.movementY); lenis.scrollTo(drag.s + d * 3, { lerp: .12 }); });
addEventListener('pointerup', () => { container.classList.remove('dragging'); setTimeout(() => (drag = null), 0); });

/* centre caption */
function setCurrent(i) {
  current = i; const p = projects[i];
  gsap.to(mid, { opacity: 0, duration: .15, onComplete: () => {
    $('#m-title').textContent = p.title; $('#m-type').textContent = p.type; $('#m-client').textContent = p.client;
    $('#m-year').textContent = p.year; $('#m-index').textContent = String(i + 1).padStart(2, '0');
    gsap.to(mid, { opacity: 1, duration: .3 });
  } });
}
setCurrent(0);

/* hover cursor */
gsap.set(cursor, { xPercent: -50, yPercent: -50, x: -999, y: -999 });
addEventListener('mousemove', (e) => gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: .4, ease: 'power2.out', overwrite: 'auto' }));
sketch.onHover = (slug) => { container.style.cursor = slug ? 'none' : ''; gsap.to(cursor, { opacity: slug ? 1 : 0, duration: .3 }); };

/* click a card → exit helix → project page */
container.addEventListener('click', (e) => {
  if (busy || drag?.moved > 6) return;
  const m = sketch.meshAt(sketch.ndcOf(e)); if (!m) return;
  openProject(m.userData.slug);
});
function openProject(slug) {
  const i = projects.findIndex((p) => p.slug === slug); if (i < 0 || busy) return;
  busy = true; lenis.stop();
  const p = projects[i];
  $('#p-title').textContent = p.title; $('#p-type').textContent = p.type; $('#p-index').textContent = String(i + 1).padStart(2, '0');
  $('#p-client').textContent = p.client; $('#p-role').textContent = p.role; $('#p-year').textContent = p.year; $('#p-tags').textContent = p.tags.join(', ');
  $('#p-body').textContent = p.body;
  const hero = $('#p-hero'); hero.replaceChildren(p.image ? Object.assign(new Image(), { src: p.image, alt: p.title }) : placeholder(p));
  const showPage = () => {
    history.pushState({ slug }, '', `#${slug}`);
    gsap.set(page, { display: 'block' }); gsap.set('#home-ui', { display: 'none' }); gsap.set(list, { display: 'none' });
    gsap.set(hero, { opacity: 0, scale: 1.08 }); gsap.set(['#project .head', '#project .back', '#p-title', '#project .meta', '#p-body'], { opacity: 0, y: 16 });
    gsap.timeline({ onComplete: () => (busy = false) })
      .to(['#project .head', '#project .back', '#p-title', '#project .meta', '#p-body'], { opacity: 1, y: 0, duration: .5, ease: 'power2.out', stagger: .04 })
      .to(hero, { opacity: 1, scale: 1, duration: .9, ease: 'expo.out' }, '-=.4');
  };
  if (view === 'list') { gsap.to(list, { opacity: 0, duration: .35, ease: 'power2.in', onComplete: showPage }); return; }
  gsap.to([...UI, cursor], { opacity: 0, y: -8, duration: .4, ease: 'power2.in', stagger: .03 });
  sketch.exitAnimation(scrollIndex, showPage);
}
function closeProject() {
  if (busy) return; busy = true;
  gsap.timeline({ onComplete: () => {
    gsap.set(page, { display: 'none' }); gsap.set('#home-ui', { display: 'block' });
    gsap.set(UI, { opacity: 1, y: 0 });
    history.replaceState({}, '', location.pathname);
    if (view === 'list') { gsap.set(list, { display: 'flex' }); gsap.to(list, { opacity: 1, duration: .4 }); busy = false; }
    else { sketch.resetOpacity(); sketch.intro = 0; lenis.start(); busy = false; enterSpiral(); }
  } })
    .to(['#project .back', '#p-title', '#project .meta', '#p-body'], { opacity: 0, y: -16, duration: .35, ease: 'power2.in', stagger: .04 })
    .to('#project .head', { opacity: 0, duration: .3, ease: 'power2.in' }, '<')
    .to('#p-hero', { opacity: 0, scale: 1.08, duration: .5, ease: 'power2.in' }, '-=.15');
}
$('#back').addEventListener('click', closeProject);
addEventListener('popstate', () => { if (page.style.display === 'block') closeProject(); else if (location.hash) openProject(location.hash.slice(1)); });

/* intro: the row of collapsed cards unfolds into the helix */
function enterSpiral() {
  gsap.set(container, { y: '120vh', rotateX: -45, opacity: 0, transformPerspective: 1200 });
  gsap.to(container, { y: 0, rotateX: 0, opacity: 1, duration: 1.6, ease: 'power3.inOut' });
  sketch.introAnimation();
}

/* list view */
list.innerHTML = projects.map((p, i) => `<a href="#${p.slug}" data-slug="${p.slug}"><span>${String(i + 1).padStart(2, '0')}</span><span>${p.title}</span><span class="h">${p.type}</span><span class="h">${p.tags.join(' · ')}</span><span class="r">${p.year}</span></a>`).join('');
list.addEventListener('click', (e) => { const a = e.target.closest('a'); if (a) { e.preventDefault(); openProject(a.dataset.slug); } });
$('.view').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || busy || b.dataset.view === view) return;
  view = b.dataset.view;
  document.querySelectorAll('.view button').forEach((x) => { x.classList.toggle('active', x === b); x.querySelector('.b').textContent = x === b ? '[·]' : '[ ]'; });
  if (view === 'list') {
    lenis.stop();
    gsap.to([container, mid], { opacity: 0, duration: .4, ease: 'power2.out' });
    gsap.set(list, { display: 'flex', opacity: 0 });
    gsap.fromTo('#list a', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .5, ease: 'power2.out', stagger: .03 });
    gsap.to(list, { opacity: 1, duration: .3 });
  } else {
    gsap.to(list, { opacity: 0, duration: .3, onComplete: () => gsap.set(list, { display: 'none' }) });
    gsap.to(mid, { opacity: 1, duration: .4 }); lenis.start(); sketch.intro = 0; enterSpiral();
  }
});

/* clock */
const tick = () => { const d = new Date(); const h = +d.toLocaleTimeString('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Dubai' }); $('#clock').textContent = `DXB, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Dubai' })}\n${h < 12 ? 'morning session' : h < 18 ? 'afternoon session' : 'evening session'}`; };
tick(); setInterval(tick, 30000);

/* boot */
document.fonts.ready.then(() => { if (location.hash && projects.some((p) => p.slug === location.hash.slice(1))) { sketch.intro = 1; openProject(location.hash.slice(1)); } else enterSpiral(); });
