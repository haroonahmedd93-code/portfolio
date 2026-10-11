/**
 * SIMPLIFY (their FOCUS) — spectral orb (violet rim, cyan core) blooms from the
 * centre (uBloom), then tightens into a gooey noisy ring with two concentric
 * rings and a dither texture (A4/A5). One full-screen fragment pass.
 */
import { createQuad, NOISE, type QuadPass } from './quad';
import type { Scene } from './types';

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uBloom;   // 0 → 1 orb blooms in
uniform float uRing;    // 0 → 1 orb tightens into a ring
out vec4 outColor;
${NOISE}
float ring(float d, float r, float w){ return exp(-pow((d - r) / w, 2.0)); }
void main(){
  vec2 res = uResolution;
  vec2 uv = (gl_FragCoord.xy - res * 0.5) / min(res.x, res.y);
  uv.y += 0.03;
  float d = length(uv);
  float ang = atan(uv.y, uv.x);
  float n = fbm(uv * 3.0 + vec2(uTime * 0.12, -uTime * 0.09));
  float wob = snoise(vec2(ang * 2.0 + uTime * 0.35, uTime * 0.2)) * 0.012 * uRing;

  // orb: soft core that shrinks as the ring forms
  float coreR = mix(0.26, 0.05, uRing) * uBloom;
  float core = exp(-pow(d / max(coreR, 0.001), 2.0) * 1.4);
  // gooey ring
  float r1 = mix(0.0, 0.22, uRing) + wob + n * 0.01 * uRing;
  float g1 = ring(d, r1, 0.012 + 0.02 * (1.0 - uRing)) * uRing;
  float g2 = ring(d, r1 + 0.055, 0.004) * 0.6 * uRing;      // outer thin ring
  float g3 = ring(d, r1 - 0.045, 0.003) * 0.45 * uRing;     // inner thin ring
  float halo = exp(-pow((d - r1) / 0.09, 2.0)) * 0.35 * uRing;

  vec3 violet = vec3(0.482, 0.235, 1.0);
  vec3 cyan = vec3(0.435, 0.965, 1.0);
  vec3 magenta = vec3(0.878, 0.294, 1.0);
  float hue = 0.5 + 0.5 * sin(ang * 1.0 + uTime * 0.4 + n * 2.0);
  vec3 spectral = mix(violet, cyan, hue);
  spectral = mix(spectral, magenta, smoothstep(0.6, 1.0, fbm(uv * 2.0 - uTime * 0.05)) * 0.5);

  vec3 col = vec3(0.0);
  col += core * mix(cyan, vec3(1.0), 0.35) * uBloom;
  col += (g1 + g2 + g3) * spectral * 1.4;
  col += halo * violet;
  // outer bloom of the orb
  col += exp(-d * 4.2) * violet * 0.55 * uBloom * (1.0 - uRing * 0.6);

  // CRT dither / scanlines
  float scan = 0.94 + 0.06 * sin(gl_FragCoord.y * 1.6);
  float dith = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.03;
  col = col * scan + dith;
  float a = clamp(max(max(col.r, col.g), col.b) * 1.2, 0.0, 1.0);
  outColor = vec4(col, a);
}
`;

export function createFocus(): Scene {
  let pass: QuadPass | null = null;
  return {
    mount(canvas) {
      pass = createQuad(canvas, FRAG, { uBloom: { value: 0 }, uRing: { value: 0 } });
    },
    setActive(active) {
      active ? pass?.start() : pass?.stop();
    },
    setProgress(p) {
      if (!pass) return;
      // first 35% blooms the orb, the rest tightens it into the ring
      pass.uniforms.uBloom.value = Math.min(1, p / 0.35);
      pass.uniforms.uRing.value = Math.max(0, Math.min(1, (p - 0.3) / 0.5));
    },
    resize() {
      pass?.resize();
    },
    destroy() {
      pass?.destroy();
    },
  };
}
