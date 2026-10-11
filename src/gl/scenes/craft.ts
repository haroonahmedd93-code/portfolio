/**
 * CRAFT — a liquid-glass card lying on a plane pitched towards the viewer,
 * ray-cast per pixel (their uYaw/uPitch/uDist/uFocal rig), lifting off the
 * plane as the chapter arrives, with a pill toggle that presses, warm/cool
 * light shafts, a slow sway and a little pointer parallax (A6/A7).
 */
import { createQuad, NOISE, type QuadPass } from './quad';
import { coarsePointer } from '../../core/rm';
import type { Scene } from './types';

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uResolution;   // physical px
uniform float uDpr;
uniform float uTime;
uniform float uYaw;         // radians (+ sway/parallax applied in JS)
uniform float uPitch;
uniform float uDist;        // plane distance, CSS px
uniform float uFocal;       // camera focal, CSS px
uniform float uLift;        // 0 → 1 card lifts off the plane
uniform float uPunch;       // 0 → 1 toggle pressed
uniform float uOut;         // 0 → 1 scene shrinks + dims (→ VALIDATION)
out vec4 outColor;
${NOISE}

const vec2 CARD_C = vec2(0.0, -1090.0);
const vec2 CARD_B = vec2(470.0, 1200.0);
const float CARD_R = 96.0;
const float LIFT_MAX = 70.0;

float sdRoundRect(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r; }

// intersect the ray with the plane offset along its normal by h; returns plane coords and hit t
vec2 planeHit(vec3 rd, vec3 P0, vec3 U, vec3 V, vec3 N, float h, out float t){
  vec3 P = P0 + N * h;
  float den = dot(rd, N);
  t = dot(P, N) / den;
  vec3 hit = rd * t;
  return vec2(dot(hit - P, U), dot(hit - P, V));
}

void main(){
  vec2 sp = (gl_FragCoord.xy - 0.5 * uResolution) / uDpr; // CSS px, y up
  float aspect = uResolution.x / uResolution.y;
  float sc = mix(1.0, 0.62, uOut);
  sp /= sc;

  vec3 rd = normalize(vec3(sp.x, sp.y, -uFocal));
  float cy = cos(uYaw), sy = sin(uYaw), cp = cos(uPitch), sq = sin(uPitch);
  vec3 U = vec3(cy, 0.0, sy);
  vec3 V = vec3(sy * sq, cp, -cy * sq);
  vec3 N = cross(U, V);
  vec3 P0 = vec3(0.0, 0.0, -uDist);

  // ambient shafts (screen space): warm from the top-left, cool from the right
  vec2 suv = sp / (0.5 * uResolution.y / uDpr);
  float shaft1 = exp(-pow((suv.x * 0.6 + 0.55 - suv.y * 0.25 + sin(uTime * 0.25) * 0.08) / 0.45, 2.0));
  float shaft2 = exp(-pow((suv.x * 0.6 - 0.8 + suv.y * 0.22 + cos(uTime * 0.2) * 0.08) / 0.5, 2.0));
  vec3 warm = vec3(0.91, 0.455, 0.18);
  vec3 cool = vec3(0.435, 0.965, 1.0);
  vec3 col = warm * shaft1 * 0.2 + cool * shaft2 * 0.16;

  float lift = uLift * LIFT_MAX;
  float tTop, tBase;
  vec2 pTop = planeHit(rd, P0, U, V, N, lift, tTop);
  vec2 pBase = planeHit(rd, P0, U, V, N, 0.0, tBase);
  bool okTop = tTop > 0.0;
  bool okBase = tBase > 0.0;

  float dTop = okTop ? sdRoundRect(pTop - CARD_C, CARD_B, CARD_R) : 1e6;
  float dBase = okBase ? sdRoundRect(pBase - CARD_C, CARD_B, CARD_R) : 1e6;
  // px per plane unit at this depth, for anti-aliasing
  float pxTop = max(uFocal / max(tTop, 1.0), 0.05);
  float aa = 1.0 / pxTop;

  // soft shadow of the card on the plane
  float shadow = (1.0 - smoothstep(0.0, 180.0, dBase)) * 0.55 * uLift;
  col *= 1.0 - shadow;

  // side wall: inside the base footprint but outside the lifted top → dark glass edge
  float sideMask = (1.0 - smoothstep(-aa, aa, dBase)) * smoothstep(-aa, aa, dTop);
  vec3 sideCol = mix(vec3(0.05, 0.03, 0.09), vec3(0.35, 0.18, 0.5), 0.5 + 0.5 * sin(pBase.x * 0.01));
  col = mix(col, sideCol, sideMask * 0.9);

  // card face
  float inside = 1.0 - smoothstep(-aa, aa, dTop);
  vec2 g = (pTop - CARD_C + CARD_B) / (2.0 * CARD_B); // 0..1 across the card
  float n = fbm(g * 3.0 + vec2(uTime * 0.06, -uTime * 0.04));
  vec3 gA = vec3(0.91, 0.455, 0.18);
  vec3 gB = vec3(0.878, 0.294, 1.0);
  vec3 gC = vec3(0.482, 0.235, 1.0);
  vec3 gD = vec3(0.435, 0.965, 1.0);
  float k = clamp(g.y * 0.9 + g.x * 0.2 + n * 0.14, 0.0, 1.0);
  vec3 screen = k < 0.5 ? mix(gA, gB, k * 2.0) : mix(gB, mix(gC, gD, (k - 0.5) * 2.0), (k - 0.5) * 2.0);
  // frosted texture + bevel
  float bevel = exp(-pow((dTop + 46.0) / 40.0, 2.0));
  float rim = exp(-pow((dTop + 8.0) / 9.0, 2.0));
  vec3 face = screen * (0.72 + 0.28 * bevel) + vec3(1.0) * rim * 0.9;
  // specular from the shafts crossing the glass, plus a moving sheen
  float sheen = exp(-pow((g.x + g.y * 0.35 - 0.3 - sin(uTime * 0.3) * 0.25) / 0.12, 2.0));
  face += vec3(1.0) * (shaft1 * 0.16 + shaft2 * 0.12 + sheen * 0.08);

  // pill toggle near the top of the card
  vec2 pillC = CARD_C + vec2(0.0, CARD_B.y - 250.0);
  float press = uPunch;
  vec2 pillB = vec2(150.0, 62.0) * (1.0 - 0.06 * press);
  float dPill = sdRoundRect(pTop - pillC, pillB, pillB.y);
  float pillIn = 1.0 - smoothstep(-aa, aa, dPill);
  float pillRim = exp(-pow((dPill + 10.0) / 9.0, 2.0));
  vec2 g2 = (pTop - vec2(60.0, 30.0) * (1.0 + press) - CARD_C + CARD_B) / (2.0 * CARD_B);
  float k2 = clamp(g2.y * 0.9 + g2.x * 0.2, 0.0, 1.0);
  vec3 refr = mix(gB, gD, k2) * 1.15;
  vec3 pill = mix(refr, vec3(1.0), 0.2 + 0.3 * press) + pillRim * 0.6;
  float knobX = mix(-82.0, 82.0, press);
  float dKnob = length(pTop - pillC - vec2(knobX, 0.0)) - 44.0;
  float knob = 1.0 - smoothstep(-aa, aa, dKnob);
  float ripple = exp(-pow((length(pTop - pillC) - 120.0 - press * 260.0) / 22.0, 2.0)) * press * (1.0 - press) * 2.0;

  vec3 cardCol = mix(face, pill, pillIn);
  cardCol = mix(cardCol, vec3(1.0), knob * 0.95);
  cardCol += ripple * 0.5;
  col = mix(col, cardCol, inside);

  // out: frame + dim
  vec2 fuv = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
  fuv.x *= aspect;
  float frame = sdRoundRect(fuv, vec2(aspect, 1.0) * sc, 0.08 * sc);
  float frameMask = 1.0 - smoothstep(-0.01, 0.0, frame);
  col *= mix(1.0, frameMask, uOut);
  col *= mix(1.0, 0.45, uOut);
  outColor = vec4(col, 1.0);
}
`;

export function createCraft(): Scene {
  let pass: QuadPass | null = null;
  let canvasEl: HTMLCanvasElement | null = null;
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const BASE_PITCH = 0.72;

  function onMove(e: PointerEvent) {
    if (!canvasEl) return;
    const r = canvasEl.getBoundingClientRect();
    ptr.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ptr.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  }

  function layout() {
    if (!pass || !canvasEl) return;
    const dpr = pass.uniforms.uDpr;
    const w = canvasEl.clientWidth || 1;
    const h = canvasEl.clientHeight || 1;
    dpr.value = (pass.uniforms.uResolution.value as number[])[0] / w;
    // focal scales with the viewport height; portrait screens zoom out (their Z())
    pass.uniforms.uFocal.value = 1150 * (h / 1015) * Math.min(1, w / h / 0.72); // tuned so the card top sits at ~42vh after lift
  }

  return {
    mount(canvas) {
      canvasEl = canvas;
      pass = createQuad(
        canvas,
        FRAG,
        {
          uDpr: { value: 1 },
          uYaw: { value: 0 },
          uPitch: { value: BASE_PITCH },
          uDist: { value: 1500 },
          uFocal: { value: 1350 },
          uLift: { value: 0 },
          uPunch: { value: 0 },
          uOut: { value: 0 },
        },
        (_dt, t) => {
          // sway + pointer parallax (their 0.013 / 0.009 rad sway)
          ptr.x += (ptr.tx - ptr.x) * 0.06;
          ptr.y += (ptr.ty - ptr.y) * 0.06;
          pass!.uniforms.uYaw.value = Math.sin(t * 0.13) * 0.013 + ptr.x * 0.05;
          pass!.uniforms.uPitch.value = BASE_PITCH + Math.cos(t * 0.11) * 0.009 + ptr.y * 0.03;
        },
      );
      layout();
      if (!coarsePointer) window.addEventListener('pointermove', onMove, { passive: true });
    },
    setActive(active) {
      active ? pass?.start() : pass?.stop();
    },
    setProgress(p) {
      if (!pass) return;
      const u = pass.uniforms;
      // stand-up / lift over the first 35% with their quintic + overshoot bump
      const s = Math.min(1, Math.max(0, p / 0.35));
      const quint = s * s * s * (s * (s * 6 - 15) + 10);
      u.uLift.value = quint + Math.sin(s * Math.PI) * s * s * s * 0.22;
      // toggle presses at 45% and releases at 75% (back.out pops)
      const back = (x: number) => 1 + 3 * Math.pow(x - 1, 3) + 2 * Math.pow(x - 1, 2);
      const edge = p < 0.45 ? 0 : p < 0.75 ? Math.min(1, (p - 0.45) / 0.06) : 1 - Math.min(1, (p - 0.75) / 0.06);
      u.uPunch.value = back(edge);
      u.uOut.value = Math.max(0, (p - 0.9) / 0.1);
    },
    resize() {
      pass?.resize();
      layout();
    },
    destroy() {
      window.removeEventListener('pointermove', onMove);
      pass?.destroy();
    },
  };
}
