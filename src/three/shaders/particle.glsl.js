// Minimal shader-like point material driven via onBeforeCompile is overkill here —
// we keep it simple and dependency-light with vertex displacement in JS + PointsMaterial,
// but expose GLSL chunks in case you want to swap in a full ShaderMaterial later.

export const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPointerInfluence;
  uniform vec2 uPointer;
  attribute float aRandom;
  varying float vRandom;

  void main() {
    vRandom = aRandom;
    vec3 pos = position;
    float wave = sin(uTime * 0.4 + aRandom * 6.2831) * 0.15;
    pos.z += wave;

    float dist = distance(pos.xy, uPointer * 4.0);
    float push = smoothstep(1.4, 0.0, dist) * uPointerInfluence;
    pos.xy += normalize(pos.xy - uPointer * 4.0 + 0.0001) * push * 0.4;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = (2.0 + aRandom * 2.5) * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fragmentShader = /* glsl */ `
  varying float vRandom;
  uniform vec3 uColorA;
  uniform vec3 uColorB;

  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d);
    vec3 color = mix(uColorA, uColorB, vRandom);
    gl_FragColor = vec4(color, alpha * 0.85);
  }
`;
