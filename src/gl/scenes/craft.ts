/**
 * CRAFT — liquid-glass slab (a phone rising from the bottom) with a gradient
 * screen, bevelled refractive edges, a pill toggle that presses, and warm/cool
 * ambient light shafts drifting behind (A6/A7). 2D-SDF version of their shader.
 */
import { createQuad, NOISE, type QuadPass } from './quad';
import type { Scene } from './types';

const FRAG = /* glsl */ `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uLift;    // 0 → 1 slab rises in
uniform float uPunch;   // 0 → 1 toggle pressed
uniform float uShrink;  // 0 → 1 scene shrinks into a rounded rect and dims (→ validation)
out vec4 outColor;
${NOISE}
float rrect(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main(){
  vec2 res = uResolution;
  float aspect = res.x / res.y;
  vec2 uv = (gl_FragCoord.xy / res) * 2.0 - 1.0; // -1..1, y up
  uv.x *= aspect;

  // scene shrink (→ VALIDATION): scale about the centre, dim; portrait screens zoom out so the slab fits
  float fit = min(1.0, aspect / 0.95);
  float sc = mix(1.0, 0.62, uShrink) * fit;
  vec2 suv = uv / sc;

  // ambient shafts: warm top-left, cool right
  float shaft1 = exp(-pow((suv.x + 0.6 - suv.y * 0.35 + sin(uTime * 0.25) * 0.08) / 0.5, 2.0));
  float shaft2 = exp(-pow((suv.x - 0.75 + suv.y * 0.3 + cos(uTime * 0.2) * 0.08) / 0.55, 2.0));
  vec3 warm = vec3(0.91, 0.455, 0.18);
  vec3 cool = vec3(0.435, 0.965, 1.0);
  vec3 col = warm * shaft1 * 0.22 + cool * shaft2 * 0.18;

  // slab: portrait rounded rect rising from the bottom
  float lift = mix(-1.9, -0.25, uLift);
  vec2 slabC = vec2(0.0, lift - 0.15);
  vec2 slabB = vec2(0.62, 1.15);
  float slabR = 0.17;
  vec2 p = suv - slabC;
  float d = rrect(p, slabB, slabR);

  // screen gradient (the "display"): orange → magenta → violet → cyan
  vec2 g = (p + slabB) / (2.0 * slabB);
  float n = fbm(g * 3.0 + uTime * 0.08);
  vec3 gradA = vec3(0.91, 0.455, 0.18);
  vec3 gradB = vec3(0.878, 0.294, 1.0);
  vec3 gradC = vec3(0.482, 0.235, 1.0);
  vec3 gradD = vec3(0.435, 0.965, 1.0);
  float k = clamp(g.y * 0.85 + g.x * 0.25 + n * 0.12, 0.0, 1.0);
  vec3 screen = k < 0.5 ? mix(gradA, gradB, k * 2.0) : mix(gradB, mix(gradC, gradD, (k - 0.5) * 2.0), (k - 0.5) * 2.0);
  screen = mix(screen, gradC, smoothstep(0.55, 1.0, g.y) * 0.4);

  float inside = 1.0 - smoothstep(-0.004, 0.004, d);
  // bevel: thin bright edge, plus refraction-like darkening just inside the edge
  float edge = exp(-pow((d + 0.02) / 0.018, 2.0));
  float bevel = exp(-pow((d + 0.06) / 0.05, 2.0));
  vec3 slab = screen * (0.78 + 0.22 * (1.0 - bevel)) + vec3(1.0) * edge * 0.75;
  // specular shafts crossing the glass
  slab += vec3(1.0) * (shaft1 * 0.18 + shaft2 * 0.14) * inside;

  // pill toggle on the slab
  vec2 pillC = vec2(0.0, lift + 0.45);
  float press = uPunch;
  float pd = rrect(suv - pillC, vec2(0.17, 0.065) * (1.0 - 0.08 * press), 0.065);
  float pillIn = 1.0 - smoothstep(-0.003, 0.003, pd);
  float pillEdge = exp(-pow((pd + 0.012) / 0.01, 2.0));
  // refraction: sample the gradient with an offset inside the pill
  vec2 g2 = ((suv - vec2(0.06, 0.02) * (1.0 + press)) - slabC + slabB) / (2.0 * slabB);
  float k2 = clamp(g2.y * 0.85 + g2.x * 0.25, 0.0, 1.0);
  vec3 refr = mix(gradB, gradD, k2);
  vec3 pill = mix(refr * 1.15, vec3(1.0), 0.18 + 0.25 * press) + pillEdge * 0.6;
  float knobX = mix(-0.095, 0.095, press);
  float kd = length((suv - pillC - vec2(knobX, 0.0)) * vec2(1.0, 1.0)) - 0.045;
  float knob = 1.0 - smoothstep(-0.003, 0.003, kd);

  col = mix(col, slab, inside);
  col = mix(col, pill, pillIn);
  col = mix(col, vec3(1.0), knob * 0.95);
  // ripple when pressed
  float ripple = exp(-pow((length(suv - pillC) - 0.12 - press * 0.25) / 0.02, 2.0)) * press * (1.0 - press) * 2.0 * inside;
  col += ripple * 0.5;

  // shrink frame: outside the shrunk rect goes dark
  float frame = rrect(uv, vec2(aspect, 1.0) * sc, 0.08 * sc);
  float frameMask = 1.0 - smoothstep(-0.01, 0.0, frame);
  col *= mix(1.0, frameMask, uShrink);
  col *= mix(1.0, 0.45, uShrink);
  outColor = vec4(col, 1.0);
}
`;

export function createCraft(): Scene {
  let pass: QuadPass | null = null;
  return {
    mount(canvas) {
      pass = createQuad(canvas, FRAG, { uLift: { value: 0 }, uPunch: { value: 0 }, uShrink: { value: 0 } });
    },
    setActive(active) {
      active ? pass?.start() : pass?.stop();
    },
    setProgress(p) {
      if (!pass) return;
      const u = pass.uniforms;
      u.uLift.value = Math.min(1, p / 0.3);
      // the toggle presses at 45% and releases at 75% with a back.out pop
      const press = p < 0.45 ? 0 : p < 0.75 ? 1 : 0;
      const ease = (x: number) => {
        const c1 = 2, c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
      };
      const edge = p < 0.45 ? 0 : p < 0.75 ? Math.min(1, (p - 0.45) / 0.06) : 1 - Math.min(1, (p - 0.75) / 0.06);
      u.uPunch.value = press ? ease(edge) : ease(edge);
      u.uShrink.value = Math.max(0, (p - 0.9) / 0.1);
    },
    resize() {
      pass?.resize();
    },
    destroy() {
      pass?.destroy();
    },
  };
}
