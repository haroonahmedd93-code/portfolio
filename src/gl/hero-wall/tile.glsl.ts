/**
 * Endless lens-warped tile grid, drawn as one full-screen pass.
 *
 * Technique after dipayanmaji/inverted-dome (fisheye/pincushion mapping of a
 * flat endless grid so tiles *and* gutters bend like the inside of a dome),
 * re-implemented here with our own reveal, dolly-snap and dim controls.
 * GLSL ES 3.00 (three.js GLSL3).
 */

export const vertexShader = /* glsl */ `
precision highp float;
in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;

uniform vec2  uResolution;   // physical px
uniform vec2  uOffset;       // grid offset, physical px
uniform float uTileW;        // physical px
uniform float uTileH;
uniform float uGap;
uniform float uRadius;       // corner radius, physical px
uniform float uCurve;        // lens strength (0 = flat)
uniform float uCurveRadius;  // lens reach as a multiple of the half-diagonal
uniform float uZoom;         // centre magnification (dolly)
uniform float uVignette;     // 0..1 edge darkening
uniform float uDim;          // 0..1 global brightness (fade to black)
uniform float uRevealT;      // seconds since reveal start (<0 = hidden)
uniform sampler2D uAtlas;
uniform float uAtlasCols;
uniform float uAtlasRows;
uniform float uAtlasCount;
uniform float uSeed;
uniform float uGroups;       // images are ordered group-interleaved (idx % groups = project)

out vec4 outColor;

// Integer hash — identical to the JS hit-test (hashCell in index.ts)
uint hashCell(int col, int row, int seed) {
  int h = col * 374761393 + row * 668265263 + seed * -2048144777;
  uint hu = uint(h) ^ (uint(h) >> 13u);
  int h2 = int(hu) * 1274126177;
  return uint(h2) ^ (uint(h2) >> 16u);
}

float expoOut(float t) { return t >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t); }

void main() {
  vec2 res = uResolution;
  vec2 center = res * 0.5;
  vec2 p = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y); // y down, like CSS
  vec2 d = p - center;
  float r = length(d);
  vec2 dir = r > 0.0001 ? d / r : vec2(0.0);

  float halfDiag = max(length(center), 1.0);
  float reach = max(halfDiag * uCurveRadius, 1.0);

  // pincushion: screen radius grows faster than the sampled radius, so a
  // fixed patch of grid spreads over more pixels near the rim
  float k = uCurve / (reach * reach);
  float kr2 = min(k * r * r, 0.95);
  float distortedR = r / (1.0 + kr2);

  float zoomFactor = max(1.0 + uZoom, 0.01);
  vec2 gridPos = center + dir * distortedR / zoomFactor + uOffset;

  float cellW = uTileW + uGap;
  float cellH = uTileH + uGap;
  vec2 cell = floor(gridPos / vec2(cellW, cellH));
  vec2 local = mod(gridPos, vec2(cellW, cellH)) - vec2(uGap * 0.5);

  // centre-out reveal: each cell scales/fades in by its distance from the
  // screen centre (in cells); the ease runs in expo.out like the type
  vec2 cellCenterScreen = (cell + 0.5) * vec2(cellW, cellH) - uOffset; // approx. (pre-lens)
  float cellDist = length((cellCenterScreen - center) / vec2(cellW, cellH));
  float t = clamp((uRevealT - min(cellDist, 7.0) * 0.075) / 1.15, 0.0, 1.0);
  float e = expoOut(t);
  float scale = mix(0.6, 1.0, e);

  vec2 halfSize = vec2(uTileW, uTileH) * 0.5;
  vec2 rel = (local - halfSize) / scale; // scale about the tile centre
  float rad = min(uRadius, min(uTileW, uTileH) * 0.5);
  vec2 q = abs(rel) - (halfSize - rad);
  float dist = length(max(q, 0.0)) - rad;
  if (dist > 0.75) discard;
  float edge = 1.0 - smoothstep(-0.75, 0.75, dist);

  vec2 uvInTile = clamp((rel + halfSize) / vec2(uTileW, uTileH), 0.0, 1.0);

  // project = (col + 2·row) mod groups → no two neighbours (incl. diagonals) show the same project;
  // the variant within a project is hashed so the pattern never visibly repeats
  int count = int(max(uAtlasCount, 1.0));
  int groups = int(max(uGroups, 1.0));
  int variants = max(count / groups, 1);
  int c = int(cell.x), rw = int(cell.y);
  int group = ((c + 2 * rw) % groups + groups) % groups;
  int variant = int(hashCell(c, rw, int(uSeed)) % uint(variants));
  float idx = float(min(group + groups * variant, count - 1));
  vec2 atlasCell = vec2(1.0 / uAtlasCols, 1.0 / uAtlasRows);
  vec2 atlasUV = (vec2(mod(idx, uAtlasCols), floor(idx / uAtlasCols)) + uvInTile) * atlasCell;

  vec4 tex = textureLod(uAtlas, atlasUV, 0.0); // explicit LOD: no derivative artefacts near the rim
  float vig = uVignette * smoothstep(0.25, 1.0, r / halfDiag);
  vec3 rgb = tex.rgb * (1.0 - vig) * uDim;
  outColor = vec4(rgb, tex.a * edge * e);
}
`;
