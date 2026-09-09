import * as THREE from 'three';
import { vertexShader, fragmentShader } from './shaders/particle.glsl.js';

// A restrained abstract particle field for the hero. Responds subtly to pointer + scroll.
// Fully torn down via dispose() so it never leaks when navigating away or on resize thrash.
export function createHeroScene(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  const COUNT = 900;
  const positions = new Float32Array(COUNT * 3);
  const randoms = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const radius = 3.2 + Math.random() * 1.6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
    positions[i * 3 + 2] = radius * Math.cos(phi) * 0.6;
    randoms[i] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uPointerInfluence: { value: 0 },
      uColorA: { value: new THREE.Color('#8a8fff') },
      uColorB: { value: new THREE.Color('#f2b880') },
    },
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const state = { pointer: new THREE.Vector2(0, 0), targetInfluence: 0, scrollT: 0 };
  let frameId = null;
  let width = 0;
  let height = 0;
  let destroyed = false;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function onPointerMove(e) {
    const rect = canvas.parentElement.getBoundingClientRect();
    state.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    state.targetInfluence = 1;
  }

  function onPointerLeave() {
    state.targetInfluence = 0;
  }

  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    state.scrollT = max > 0 ? window.scrollY / max : 0;
  }

  const clock = new THREE.Clock();

  function tick() {
    if (destroyed) return;
    const t = clock.getElapsedTime();
    material.uniforms.uTime.value = t;
    material.uniforms.uPointer.value.lerp(state.pointer, 0.06);
    material.uniforms.uPointerInfluence.value +=
      (state.targetInfluence - material.uniforms.uPointerInfluence.value) * 0.05;

    points.rotation.y = t * 0.05 + state.scrollT * 0.6;
    points.rotation.x = state.scrollT * 0.3;

    renderer.render(scene, camera);
    frameId = requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  tick();

  return {
    dispose() {
      destroyed = true;
      if (frameId) cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('scroll', onScroll);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
