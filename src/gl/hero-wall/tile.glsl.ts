/**
 * One merged geometry for the whole dome. Each vertex carries its tile's centre
 * and basis vectors so the reveal scale happens about the tile centre, plus a
 * per-tile delay so the reveal runs centre-out without per-mesh tweens.
 */

export const vertexShader = /* glsl */ `
attribute vec3 aCenter;   // tile centre on the sphere
attribute vec3 aRight;    // tile right vector × half size
attribute vec3 aUp;       // tile up vector × half size
attribute vec2 aLocal;    // corner in tile space (-1..1)
attribute float aDelay;   // reveal delay in seconds
uniform float uRevealT;   // seconds since reveal started
varying vec2 vLocal;
varying float vAlpha;

float expoOut(float t) { return t >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t); }

void main() {
  float t = clamp((uRevealT - aDelay) / 1.15, 0.0, 1.0);
  float e = expoOut(t);
  float scale = mix(0.6, 1.0, e);
  vAlpha = e;
  vLocal = aLocal;
  vec3 p = aCenter + (aRight * aLocal.x + aUp * aLocal.y) * scale;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
uniform sampler2D uMap;
uniform float uRadius;
uniform float uDim;
varying vec2 vLocal;
varying float vAlpha;

void main() {
  // rounded-rectangle mask in tile space (-1..1)
  vec2 q = abs(vLocal) - (1.0 - uRadius);
  float d = length(max(q, 0.0)) - uRadius;
  float mask = 1.0 - smoothstep(-0.012, 0.012, d);
  vec4 c = texture2D(uMap, vLocal * 0.5 + 0.5);
  gl_FragColor = vec4(c.rgb * uDim, c.a * mask * vAlpha);
  #include <colorspace_fragment>
}
`;
