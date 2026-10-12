/**
 * Endless project-card grid, drawn as one full-screen pass and bent with the
 * barrel distortion + corner vignette from Phantom.land's grid (Codrops,
 * "Invisible Forces", 2025): the screen is mapped as
 *   s  = 2·(uv − ½)
 *   s' = s · (0.88 + distortion · s·s)
 * so the grid bulges towards the viewer and the edges fall away, darkened by
 * smoothstep(0.8, offset·0.799, (darkness + offset)·|s|).
 * Our grid is procedural (an endless sheet of atlas cards), so unlike Phantom's
 * render-to-texture pass there is nothing to run out of at the rim.
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
uniform float uDistortion;   // 0 = flat, ~0.3 = curved
uniform float uScale;        // base sample scale (0.88 like Phantom; ×1/zoom on the dolly, ×1.15 while pressed)
uniform float uVigOffset;
uniform float uVigDarkness;
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

  // Phantom's DistortionShader, in screen space
  vec2 s = 2.0 * (p / res - 0.5);
  float distToCenter = length(s);
  s *= (uScale + uDistortion * dot(s, s));
  vec2 gridPos = center + s * center + uOffset;

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
  float scale = mix(0.7, 1.0, e);

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
  // Phantom's vignette (their smoothstep runs edge1 < edge0; written the defined way round)
  float vig = 1.0 - smoothstep(uVigOffset * 0.799, 0.8, (uVigDarkness + uVigOffset) * distToCenter);
  vec3 rgb = tex.rgb * vig * uDim;
  outColor = vec4(rgb, tex.a * edge * e);
}
`;
