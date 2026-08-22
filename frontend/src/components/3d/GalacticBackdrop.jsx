import React, { useMemo, useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * GalacticBackdrop — a nebula skydome plus a stable starfield.
 *
 * Replaces drei's <Stars>, which animated per-star opacity every frame and
 * caused heavy shimmer on small points. Here brightness is baked into a vertex
 * attribute and never changes, so stars stay rock steady; only a very slow
 * whole-field rotation gives a sense of drift.
 *
 * Palette is drawn from the project theme: deep space navy, violet, indigo and
 * blue, with restrained pink and amber highlights near the galactic core.
 */

/* ── Nebula skydome shader ─────────────────────────────────────────────────
   Renders on the inside of a large sphere. A fractal-noise band across the
   sphere reads as the Milky Way; colours are ramped through the project
   palette rather than the photographic blues/oranges of a real photo.        */

const nebulaVertex = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const nebulaFragment = /* glsl */ `
  varying vec3 vPos;
  uniform float uTime;

  // Project palette
  uniform vec3 uDeep;    // background navy
  uniform vec3 uViolet;
  uniform vec3 uIndigo;
  uniform vec3 uBlue;
  uniform vec3 uPink;
  uniform vec3 uAmber;

  // -- value noise + fbm ---------------------------------------------------
  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)),
              dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
          mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
              dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
      mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
              dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
          mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
              dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y),
      u.z);
  }

  float fbm(vec3 p) {
    float total = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      total += noise(p) * amp;
      p *= 2.02;
      amp *= 0.5;
    }
    return total;
  }

  void main() {
    vec3 dir = normalize(vPos);

    // Tilted galactic plane. Distance from this plane defines the band.
    vec3 planeNormal = normalize(vec3(0.35, 1.0, 0.15));
    float distToPlane = abs(dot(dir, planeNormal));

    // Very slow evolution so the nebula breathes without visible motion
    float t = uTime * 0.006;

    // Two noise octaves: broad cloud shape, then finer detail
    float cloud = fbm(dir * 2.2 + vec3(t, 0.0, -t));
    float detail = fbm(dir * 6.5 + vec3(-t, t, 0.0));

    // Band falloff — tight core, soft edges
    float band = 1.0 - smoothstep(0.0, 0.55, distToPlane);
    band = pow(band, 2.2);

    // Combine band with clouds so the arm looks irregular, not a clean stripe
    float density = band * (0.55 + cloud * 0.75) + detail * 0.10 * band;
    density = clamp(density, 0.0, 1.0);

    // Brightest region — the galactic core, offset along the band
    float core = pow(max(0.0, 1.0 - length(dir - normalize(vec3(0.55, 0.25, -0.8))) * 0.95), 3.0);

    // Restrained colour ramp — the nebula should be a subtle presence you
    // notice on a second look, not the focal point of the frame.
    vec3 col = uDeep;
    col = mix(col, uIndigo, density * 0.75);
    col = mix(col, uBlue, detail * density * 0.35);
    col = mix(col, uViolet, pow(density, 1.9) * 0.5);
    col = mix(col, uPink, pow(density, 3.2) * 0.28);
    col = mix(col, uAmber, core * density * 0.22);

    // Barely-there wash so empty sky has depth without turning purple
    col += uIndigo * 0.06;

    gl_FragColor = vec4(col, 1.0);
  }
`

function NebulaDome() {
  const matRef = useRef()

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    // Muted, desaturated palette so the sky reads as real deep space rather
    // than a saturated poster. Contrast against brightly lit planets is what
    // makes the scene feel alive — not a colourful background.
    uDeep: { value: new THREE.Color('#07070f') },
    uViolet: { value: new THREE.Color('#4a4370') },
    uIndigo: { value: new THREE.Color('#232045') },
    uBlue: { value: new THREE.Color('#2c3a5c') },
    uPink: { value: new THREE.Color('#5c4356') },
    uAmber: { value: new THREE.Color('#6b5a44') },
  }), [])

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh scale={[-1, 1, 1]} renderOrder={-1000}>
      {/* Large sphere, inverted so we see the inside */}
      <sphereGeometry args={[400, 48, 32]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={nebulaVertex}
        fragmentShader={nebulaFragment}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

/* ── Starfield ─────────────────────────────────────────────────────────────
   Soft round sprites with baked per-star brightness. No per-frame opacity
   changes, which is what eliminates the flicker.                            */

/** Generate a soft radial dot once, used as the point sprite. */
function makeStarTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')

  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0.0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.28)')
  g.addColorStop(1.0, 'rgba(255,255,255,0)')

  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function StarField({ count = 3500 }) {
  const groupRef = useRef()

  // Debounce star count changes at 300ms so rapid slider drags don't
  // regenerate geometry on every intermediate value (Requirement 6.2).
  const [debouncedCount, setDebouncedCount] = useState(count)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCount(count), 300)
    return () => clearTimeout(timer)
  }, [count])

  const sprite = useMemo(() => makeStarTexture(), [])

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(debouncedCount * 3)
    const colors = new Float32Array(debouncedCount * 3)
    const sizes = new Float32Array(debouncedCount)

    // Star tints kept within the project palette
    const palette = [
      new THREE.Color('#ffffff'),
      new THREE.Color('#dbeafe'), // pale blue
      new THREE.Color('#e9d5ff'), // pale violet
      new THREE.Color('#fef3c7'), // pale amber
      new THREE.Color('#fbcfe8'), // pale pink
    ]

    for (let i = 0; i < debouncedCount; i++) {
      // Uniform distribution on a spherical shell
      const u = Math.random()
      const v = Math.random()
      const theta = 2 * Math.PI * u
      const phi = Math.acos(2 * v - 1)
      const radius = 150 + Math.random() * 180

      positions[i * 3]     = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi)
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

      // Weight toward white/blue, occasional warm star
      const pick = Math.random()
      const base = pick < 0.55 ? palette[0]
                 : pick < 0.75 ? palette[1]
                 : pick < 0.90 ? palette[2]
                 : pick < 0.96 ? palette[3]
                 : palette[4]

      // Bake brightness in — this is what keeps stars from flickering
      const brightness = 0.45 + Math.random() * 0.55
      colors[i * 3]     = base.r * brightness
      colors[i * 3 + 1] = base.g * brightness
      colors[i * 3 + 2] = base.b * brightness

      // A few noticeably larger stars, most small
      sizes[i] = Math.random() < 0.06
        ? 2.6 + Math.random() * 2.0
        : 0.9 + Math.random() * 1.1
    }

    return { positions, colors, sizes }
  }, [debouncedCount])

  // Extremely slow rotation only — no opacity animation anywhere
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.004
    }
  })

  return (
    <points ref={groupRef} renderOrder={-999}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        vertexColors
        size={2.2}
        sizeAttenuation
        transparent
        alphaTest={0.01}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

/**
 * Combined backdrop: nebula dome behind a stable starfield.
 */
export default function GalacticBackdrop({ starCount = 3500 }) {
  return (
    <group>
      <NebulaDome />
      <StarField count={starCount} />
    </group>
  )
}
