/**
 * Instanced tile planes on the inside of a sphere — one draw call for the
 * whole wall. Each instance carries its atlas index, reveal alpha and scale.
 * GLSL ES 3.00 (three.js GLSL3).
 */

export const vertexShader = /* glsl */ `
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
in vec3 position;
in vec2 uv;
in mat4 instanceMatrix;
in float aIndex;
in float aAlpha;
in float aScale;
out vec2 vUv;
out float vIndex;
out float vAlpha;
void main() {
  vUv = uv;
  vIndex = aIndex;
  vAlpha = aAlpha;
  // scale about the tile centre (the plane is centred on its origin)
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position * aScale, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;
uniform sampler2D uAtlas;
uniform float uAtlasCols;
uniform float uAtlasRows;
uniform float uRadius;     // corner radius as a fraction of the tile
uniform float uDim;        // 0..1 global brightness (fade to black)
uniform float uVignette;   // 0..1 edge darkening (screen space)
uniform vec2  uResolution; // physical px
in vec2 vUv;
in float vIndex;
in float vAlpha;
out vec4 outColor;

void main() {
  // rounded corners
  vec2 q = abs(vUv - 0.5) - (0.5 - uRadius);
  float d = length(max(q, 0.0)) - uRadius;
  float aa = max(fwidth(d), 1e-4); // d is constant inside the tile: fwidth 0 would make smoothstep NaN
  float edge = 1.0 - smoothstep(-aa, aa, d);
  if (edge <= 0.001) discard;

  // atlas rows run top → bottom; plane uv runs bottom → top
  vec2 cellUv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 atlasUV = (vec2(mod(vIndex, uAtlasCols), floor(vIndex / uAtlasCols)) + cellUv) / vec2(uAtlasCols, uAtlasRows);
  vec4 tex = textureLod(uAtlas, atlasUV, 0.0);

  vec2 s = (gl_FragCoord.xy / uResolution) * 2.0 - 1.0;
  float vig = uVignette * smoothstep(0.35, 1.25, length(s));
  outColor = vec4(tex.rgb * (1.0 - vig) * uDim, tex.a * edge * vAlpha);
}
`;
