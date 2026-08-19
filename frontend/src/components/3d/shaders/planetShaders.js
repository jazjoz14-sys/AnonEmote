/**
 * Procedural GLSL shaders for emotion planet surfaces.
 *
 * Each planet gets a unique shader that generates its surface texture
 * entirely on the GPU using noise functions and animated patterns.
 * No external texture files needed — pure real-time procedural generation.
 *
 * Techniques used:
 * - Simplex noise (3D) for organic surface variation
 * - Fractal Brownian Motion (fBm) for layered detail
 * - Animated uniforms for living, breathing surfaces
 * - Per-planet color palettes tied to emotional states
 */

// ═══════════════════════════════════════════════════════════════
// SHARED GLSL FUNCTIONS (included in all planet shaders)
// ═══════════════════════════════════════════════════════════════

const NOISE_FUNCTIONS = /* glsl */ `
  // Simplex 3D noise — compact GLSL implementation
  vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  // Fractal Brownian Motion — layered noise for organic detail
  float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 6; i++) {
      if (i >= octaves) break;
      value += amplitude * snoise(p * frequency);
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }
`

// ═══════════════════════════════════════════════════════════════
// SHARED VERTEX SHADER
// ═══════════════════════════════════════════════════════════════

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// ═══════════════════════════════════════════════════════════════
// PER-PLANET FRAGMENT SHADERS
// ═══════════════════════════════════════════════════════════════

const JOY_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec3 vPosition;
  varying vec3 vNormal;
  ${NOISE_FUNCTIONS}

  void main() {
    vec3 pos = vPosition * 2.5;

    // Warm golden base with swirling sun-like patterns
    float n1 = fbm(pos + vec3(uTime * 0.1, 0.0, uTime * 0.05), 4);
    float n2 = snoise(pos * 3.0 + vec3(0.0, uTime * 0.2, 0.0));

    // Sunspot-like darker regions
    float spots = smoothstep(0.3, 0.5, snoise(pos * 1.5 + uTime * 0.03));

    vec3 gold = vec3(1.0, 0.85, 0.24);
    vec3 orange = vec3(1.0, 0.6, 0.1);
    vec3 bright = vec3(1.0, 0.95, 0.7);

    vec3 color = mix(gold, orange, n1 * 0.5 + 0.5);
    color = mix(color, bright, n2 * 0.3 + 0.15);
    color = mix(color, gold * 0.7, spots * 0.4);

    // Rim glow
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    color += bright * pow(rim, 3.0) * 0.4;

    gl_FragColor = vec4(color, 1.0);
  }
`

const VENT_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec3 vPosition;
  varying vec3 vNormal;
  ${NOISE_FUNCTIONS}

  void main() {
    vec3 pos = vPosition * 3.0;

    // Volcanic surface with flowing lava cracks
    float cracks = abs(snoise(pos * 4.0 + vec3(0.0, uTime * 0.15, 0.0)));
    cracks = pow(cracks, 0.4);

    float lava = smoothstep(0.0, 0.3, 1.0 - cracks);
    float surface = fbm(pos + uTime * 0.02, 3);

    vec3 darkRock = vec3(0.15, 0.05, 0.05);
    vec3 hotRock = vec3(0.4, 0.1, 0.05);
    vec3 lavaColor = vec3(1.0, 0.3, 0.05);
    vec3 brightLava = vec3(1.0, 0.7, 0.1);

    vec3 color = mix(darkRock, hotRock, surface * 0.5 + 0.5);
    color = mix(color, lavaColor, lava * 0.7);
    color = mix(color, brightLava, lava * smoothstep(0.5, 0.9, lava));

    // Pulsing emissive in cracks
    float pulse = sin(uTime * 2.0) * 0.15 + 0.85;
    color += lavaColor * lava * pulse * 0.5;

    gl_FragColor = vec4(color, 1.0);
  }
`

const ADVICE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec3 vPosition;
  varying vec3 vNormal;
  ${NOISE_FUNCTIONS}

  void main() {
    vec3 pos = vPosition * 2.0;

    // Mystical crystal surface with geometric facets
    float facets = snoise(pos * 5.0) * 0.5 + snoise(pos * 10.0) * 0.25;
    float shimmer = snoise(pos * 8.0 + uTime * 0.3);

    // Refraction-like color shift
    float angle = dot(vNormal, vec3(0.0, 1.0, 0.0));
    float iridescence = snoise(vec3(angle * 3.0, uTime * 0.2, 0.0));

    vec3 teal = vec3(0.3, 0.8, 0.77);
    vec3 cyan = vec3(0.4, 0.9, 0.95);
    vec3 deep = vec3(0.1, 0.4, 0.45);
    vec3 sparkle = vec3(0.9, 1.0, 1.0);

    vec3 color = mix(teal, cyan, facets + 0.5);
    color = mix(color, deep, smoothstep(0.2, 0.6, -facets));
    color += sparkle * smoothstep(0.6, 0.8, shimmer) * 0.4;
    color = mix(color, cyan * 1.2, iridescence * 0.2);

    // Crystal rim highlight
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    color += sparkle * pow(rim, 4.0) * 0.3;

    gl_FragColor = vec4(color, 1.0);
  }
`

const GRIEF_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec3 vPosition;
  varying vec3 vNormal;
  ${NOISE_FUNCTIONS}

  void main() {
    vec3 pos = vPosition * 2.0;

    // Deep, slow-moving purple clouds like heavy fog
    float clouds = fbm(pos + vec3(uTime * 0.03, uTime * 0.02, 0.0), 5);
    float depth = fbm(pos * 0.5 + vec3(0.0, 0.0, uTime * 0.01), 3);

    // Rain-like streaks
    float rain = snoise(vec3(pos.x * 8.0, pos.y * 2.0 + uTime * 0.5, pos.z * 8.0));
    rain = smoothstep(0.5, 0.7, rain);

    vec3 deepPurple = vec3(0.25, 0.1, 0.35);
    vec3 purple = vec3(0.5, 0.2, 0.6);
    vec3 misty = vec3(0.4, 0.3, 0.5);
    vec3 silver = vec3(0.6, 0.55, 0.7);

    vec3 color = mix(deepPurple, purple, clouds * 0.5 + 0.5);
    color = mix(color, misty, depth * 0.3 + 0.2);
    color += silver * rain * 0.2;

    // Subtle melancholy glow
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    color += misty * pow(rim, 3.0) * 0.2;

    gl_FragColor = vec4(color, 1.0);
  }
`

const ANXIETY_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec3 vPosition;
  varying vec3 vNormal;
  ${NOISE_FUNCTIONS}

  void main() {
    vec3 pos = vPosition * 3.0;

    // Chaotic, electric surface with jittery patterns
    float chaos = fbm(pos + vec3(sin(uTime * 0.8) * 0.5, cos(uTime * 0.6) * 0.5, uTime * 0.3), 5);
    float sparks = snoise(pos * 6.0 + uTime * 1.5);
    sparks = pow(max(sparks, 0.0), 3.0);

    // Lightning-like veins
    float veins = abs(snoise(pos * 4.0 + vec3(uTime * 0.4, 0.0, uTime * 0.3)));
    veins = pow(1.0 - veins, 6.0);

    vec3 amber = vec3(0.95, 0.6, 0.07);
    vec3 dark = vec3(0.3, 0.15, 0.0);
    vec3 electric = vec3(1.0, 0.9, 0.4);
    vec3 hot = vec3(1.0, 0.5, 0.0);

    vec3 color = mix(dark, amber, chaos * 0.5 + 0.5);
    color = mix(color, hot, smoothstep(0.3, 0.7, chaos));
    color += electric * sparks * 0.6;
    color += electric * veins * 0.8;

    gl_FragColor = vec4(color, 1.0);
  }
`

const NEUTRAL_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec3 vPosition;
  varying vec3 vNormal;
  ${NOISE_FUNCTIONS}

  void main() {
    vec3 pos = vPosition * 2.0;

    // Calm stone surface with very subtle movement
    float stone = fbm(pos + uTime * 0.01, 4);
    float grain = snoise(pos * 12.0) * 0.05;

    // Zen garden-like ripple patterns
    float ripples = sin(length(pos.xz) * 6.0 + uTime * 0.2) * 0.1;

    vec3 grey = vec3(0.58, 0.65, 0.65);
    vec3 lightGrey = vec3(0.72, 0.76, 0.76);
    vec3 blueGrey = vec3(0.5, 0.58, 0.62);

    vec3 color = mix(grey, lightGrey, stone * 0.4 + 0.5);
    color = mix(color, blueGrey, ripples + 0.5);
    color += grain;

    // Soft ambient rim
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    color += lightGrey * pow(rim, 4.0) * 0.15;

    gl_FragColor = vec4(color, 1.0);
  }
`

const DOODLE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec3 vPosition;
  varying vec3 vNormal;
  ${NOISE_FUNCTIONS}

  void main() {
    vec3 pos = vPosition * 2.0;

    // White/cream canvas with subtle paper texture
    float paper = snoise(pos * 15.0) * 0.03;
    float grain = fbm(pos * 8.0, 2) * 0.04;

    // Faint colorful ink splotches drifting across
    float ink1 = smoothstep(0.3, 0.5, snoise(pos * 2.0 + uTime * 0.05));
    float ink2 = smoothstep(0.3, 0.5, snoise(pos * 2.5 + vec3(3.0, 0.0, uTime * 0.04)));

    vec3 white = vec3(0.95, 0.93, 0.9);
    vec3 cream = vec3(0.98, 0.96, 0.92);
    vec3 pink = vec3(1.0, 0.8, 0.85);
    vec3 blue = vec3(0.8, 0.85, 1.0);

    vec3 color = mix(white, cream, paper + grain + 0.5);
    color = mix(color, pink, ink1 * 0.15);
    color = mix(color, blue, ink2 * 0.12);

    gl_FragColor = vec4(color, 1.0);
  }
`

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * Returns the vertex + fragment shader pair for a given planet ID.
 * @param {string} planetId - One of: joy, vent, advice, grief, anxiety, neutral, doodle
 * @returns {{ vertexShader: string, fragmentShader: string }}
 */
export function getPlanetShader(planetId) {
  const fragments = {
    joy: JOY_FRAGMENT,
    vent: VENT_FRAGMENT,
    advice: ADVICE_FRAGMENT,
    grief: GRIEF_FRAGMENT,
    anxiety: ANXIETY_FRAGMENT,
    neutral: NEUTRAL_FRAGMENT,
    doodle: DOODLE_FRAGMENT,
  }

  return {
    vertexShader: VERTEX_SHADER,
    fragmentShader: fragments[planetId] || NEUTRAL_FRAGMENT,
  }
}
