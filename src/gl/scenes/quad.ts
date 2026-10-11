/** Minimal three.js full-screen fragment pass used by the shader scenes. */
import { BufferAttribute, BufferGeometry, GLSL3, Mesh, OrthographicCamera, RawShaderMaterial, Scene, WebGLRenderer, type IUniform } from 'three';
import { gsap } from '../../core/gsap';
import { dprCap } from './types';

export const VERT = /* glsl */ `
precision highp float;
in vec3 position;
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x - floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy)); vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0); m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p){ float f = 0.0; float a = 0.5; for(int i=0;i<4;i++){ f += a*snoise(p); p *= 2.02; a *= 0.5; } return f; }
`;

export interface QuadPass {
  renderer: WebGLRenderer;
  uniforms: Record<string, IUniform>;
  render(): void;
  resize(): void;
  start(): void;
  stop(): void;
  destroy(): void;
}

export function createQuad(canvas: HTMLCanvasElement, fragment: string, uniforms: Record<string, IUniform>, onFrame?: (dt: number, t: number) => void): QuadPass | null {
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
  renderer.setClearColor(0, 0);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
  const u = { uResolution: { value: [1, 1] }, uTime: { value: 0 }, ...uniforms };
  const material = new RawShaderMaterial({ glslVersion: GLSL3, vertexShader: VERT, fragmentShader: fragment, uniforms: u, transparent: true, depthTest: false, depthWrite: false });
  const scene = new Scene();
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  function resize() {
    const dpr = dprCap(1.5);
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    u.uResolution.value = [w * dpr, h * dpr];
  }
  let last = 0;
  let t = 0;
  const tick = (time: number) => {
    const dt = Math.min(time - last, 0.05) || 0.016;
    last = time;
    t += dt;
    u.uTime.value = t;
    onFrame?.(dt, t);
    renderer.render(scene, camera);
  };
  let running = false;
  resize();
  return {
    renderer,
    uniforms: u,
    render: () => renderer.render(scene, camera),
    resize,
    start() {
      if (running) return;
      running = true;
      last = gsap.ticker.time;
      gsap.ticker.add(tick);
    },
    stop() {
      running = false;
      gsap.ticker.remove(tick);
    },
    destroy() {
      gsap.ticker.remove(tick);
      material.dispose();
      geometry.dispose();
      renderer.dispose();
    },
  };
}
