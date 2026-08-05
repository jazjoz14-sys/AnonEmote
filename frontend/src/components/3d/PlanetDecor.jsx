import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CLAY, CLAY_GLOSS, makeClayTube, shade } from './clay'

/**
 * PlanetDecor — hand-modelled clay props expressing each planet's emotion.
 *
 * Everything is built from primitives with matte clay materials and kept
 * low-poly. Props stay below the name label, which sits at
 * planet.size * 1.35 + 1.5 (see EmotionPlanet), so nothing occludes it.
 */

/* ── shared helpers ──────────────────────────────────────────────────────── */

/** Fibonacci-distributed points on a sphere, for scattering surface props. */
function scatter(count, radius, seed = 1, yBias = 0) {
  const pts = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i + seed
    const yy = THREE.MathUtils.clamp(y + yBias, -1, 1)
    pts.push(new THREE.Vector3(
      Math.cos(theta) * r * radius,
      yy * radius,
      Math.sin(theta) * r * radius
    ))
  }
  return pts
}

/** Orient a prop so it stands upright on the planet surface. */
function surfaceProps(pos) {
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    pos.clone().normalize()
  )
  return { position: pos.toArray(), quaternion: quat }
}

/** Wrapper that bobs and slowly spins a prop. */
function FloatingProp({ position, speed = 1, amount = 0.2, children }) {
  const ref = useRef()
  const base = useMemo(
    () => (position.isVector3 ? position.clone() : new THREE.Vector3(...position)),
    [position]
  )

  useFrame((s) => {
    if (ref.current) {
      ref.current.position.y = base.y + Math.sin(s.clock.elapsedTime * speed) * amount
      ref.current.rotation.y = s.clock.elapsedTime * speed * 0.4
    }
  })

  return <group ref={ref} position={base.toArray()}>{children}</group>
}

/** A ring of props orbiting the planet on a tilted plane. */
function OrbitingRing({ count, radius, tilt = 0.3, speed = 0.3, children }) {
  const ref = useRef()
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * speed
  })
  return (
    <group ref={ref} rotation={[tilt, 0, 0]}>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2
        return (
          <group key={i} position={[Math.cos(a) * radius, 0, Math.sin(a) * radius]}>
            {children(i)}
          </group>
        )
      })}
    </group>
  )
}

/* ══ JOY — sun rays, confetti, halo arc, blossoms ═══════════════════════════ */

function JoyDecor({ planet }) {
  const spinRef = useRef()
  const r = planet.size
  const spikes = useMemo(() => scatter(10, r * 0.98, 3), [r])
  const blossoms = useMemo(() => scatter(6, r * 0.99, 31, 0.15), [r])

  useFrame((s) => {
    if (spinRef.current) spinRef.current.rotation.y = s.clock.elapsedTime * 0.25
  })

  return (
    <group>
      <group ref={spinRef}>
        {/* Chunky sun rays pressed into the surface */}
        {spikes.map((p, i) => {
          const { position, quaternion } = surfaceProps(p)
          return (
            <mesh key={i} position={position} quaternion={quaternion}>
              <coneGeometry args={[r * 0.12, r * 0.38, 6]} />
              <meshStandardMaterial color={shade(planet.color, 0.35)} {...CLAY} />
            </mesh>
          )
        })}

        {/* Small blossoms — five petals around a centre */}
        {blossoms.map((p, i) => {
          const { position, quaternion } = surfaceProps(p)
          return (
            <group key={`b${i}`} position={position} quaternion={quaternion}>
              {[0, 1, 2, 3, 4].map((k) => {
                const a = (k / 5) * Math.PI * 2
                return (
                  <mesh
                    key={k}
                    position={[Math.cos(a) * r * 0.08, r * 0.04, Math.sin(a) * r * 0.08]}
                    scale={[1, 0.4, 1]}
                  >
                    <sphereGeometry args={[r * 0.055, 8, 6]} />
                    <meshStandardMaterial color="#fde68a" {...CLAY} />
                  </mesh>
                )
              })}
              <mesh position={[0, r * 0.06, 0]}>
                <sphereGeometry args={[r * 0.04, 8, 6]} />
                <meshStandardMaterial color="#fb923c" {...CLAY} />
              </mesh>
            </group>
          )
        })}
      </group>

      {/* Celebratory halo arc, tilted */}
      <group rotation={[0.5, 0, 0.4]}>
        <mesh>
          <torusGeometry args={[r * 1.5, r * 0.05, 8, 48, Math.PI * 1.4]} />
          <meshStandardMaterial
            color="#fcd34d"
            emissive="#f59e0b"
            emissiveIntensity={0.3}
            {...CLAY}
          />
        </mesh>
      </group>

      {/* Confetti chips orbiting */}
      <OrbitingRing count={8} radius={r * 1.75} tilt={0.5} speed={0.4}>
        {(i) => (
          <mesh rotation={[i * 0.7, i, i * 0.4]}>
            <boxGeometry args={[r * 0.1, r * 0.1, r * 0.025]} />
            <meshStandardMaterial
              color={['#fef3c7', '#fbbf24', '#fb923c', '#fda4af'][i % 4]}
              {...CLAY}
            />
          </mesh>
        )}
      </OrbitingRing>

      {/* Bobbing clay stars */}
      {[0, 1, 2, 3].map((i) => {
        const a = i * 1.7
        return (
          <FloatingProp
            key={`s${i}`}
            position={new THREE.Vector3(Math.cos(a) * r * 2.1, r * (0.4 + i * 0.3), Math.sin(a) * r * 2.1)}
            speed={0.9 + i * 0.2}
            amount={0.18}
          >
            <mesh rotation={[0.4, i, 0]}>
              <octahedronGeometry args={[r * 0.13, 0]} />
              <meshStandardMaterial
                color="#fffbeb"
                emissive={planet.color}
                emissiveIntensity={0.35}
                {...CLAY}
              />
            </mesh>
          </FloatingProp>
        )
      })}
    </group>
  )
}

/* ══ VENTING — small offset cloud, rain, lightning, vents, cracks ══════════ */

function VentDecor({ planet }) {
  const r = planet.size

  /* Cloud is smaller and pushed off to one side so it never sits under the
     name label directly above the planet. */
  const cloudCentre = useMemo(() => [r * 0.85, r * 0.92, r * 0.3], [r])
  const puffs = useMemo(() => ([
    [0, 0, 0, 0.3],
    [r * 0.26, -r * 0.05, r * 0.06, 0.22],
    [-r * 0.24, -r * 0.04, -r * 0.05, 0.2],
    [r * 0.05, r * 0.14, -r * 0.16, 0.17],
  ]), [r])

  const vents = useMemo(() => scatter(5, r * 0.98, 5, -0.15), [r])
  const cracks = useMemo(() => scatter(4, r * 0.99, 23, 0.1), [r])

  return (
    <group>
      {/* Storm cloud */}
      <group position={cloudCentre}>
        {puffs.map(([x, y, z, s], i) => (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[r * s, 14, 10]} />
            <meshStandardMaterial color="#6b7280" {...CLAY} />
          </mesh>
        ))}

        {/* Lightning bolt hanging from the cloud */}
        <LightningBolt r={r} />
      </group>

      {/* Rain falling from the cloud toward the surface */}
      {[0, 1, 2, 3, 4].map((i) => (
        <RainDrop key={`d${i}`} planet={planet} index={i} origin={cloudCentre} />
      ))}

      {/* Pressure vents releasing steam */}
      {vents.map((p, i) => {
        const { position, quaternion } = surfaceProps(p)
        return (
          <group key={`v${i}`} position={position} quaternion={quaternion}>
            <mesh>
              <cylinderGeometry args={[r * 0.1, r * 0.14, r * 0.18, 8]} />
              <meshStandardMaterial color={shade(planet.color, -0.4)} {...CLAY} />
            </mesh>
            <SteamPuff r={r} offset={i} />
          </group>
        )
      })}

      {/* Cracked surface plates — pressure showing through */}
      {cracks.map((p, i) => {
        const { position, quaternion } = surfaceProps(p)
        return (
          <mesh key={`c${i}`} position={position} quaternion={quaternion}
                rotation-y={i * 1.1} scale={[1, 0.18, 0.35]}>
            <boxGeometry args={[r * 0.5, r * 0.1, r * 0.1]} />
            <meshStandardMaterial color={shade(planet.color, -0.5)} {...CLAY} />
          </mesh>
        )
      })}
    </group>
  )
}

function LightningBolt({ r }) {
  const ref = useRef()

  useFrame((s) => {
    if (!ref.current) return
    // Occasional flash rather than constant glow
    const flash = Math.sin(s.clock.elapsedTime * 2.2)
    const on = flash > 0.93
    ref.current.material.opacity = on ? 1 : 0.15
    ref.current.material.emissiveIntensity = on ? 2.2 : 0.2
  })

  const geo = useMemo(() => makeClayTube([
    new THREE.Vector3(0, -r * 0.28, 0),
    new THREE.Vector3(r * 0.1, -r * 0.45, 0),
    new THREE.Vector3(-r * 0.05, -r * 0.58, 0),
    new THREE.Vector3(r * 0.06, -r * 0.78, 0),
  ], r * 0.035, 12), [r])

  return (
    <mesh ref={ref} geometry={geo}>
      <meshStandardMaterial
        color="#fef08a"
        emissive="#fde047"
        emissiveIntensity={0.2}
        transparent
        opacity={0.15}
        {...CLAY}
      />
    </mesh>
  )
}

function SteamPuff({ r, offset }) {
  const ref = useRef()
  useFrame((s) => {
    if (!ref.current) return
    const t = (s.clock.elapsedTime * 0.4 + offset * 0.3) % 1
    ref.current.position.y = r * 0.12 + t * r * 0.4
    ref.current.scale.setScalar(0.4 + t * 1.1)
    ref.current.material.opacity = (1 - t) * 0.35
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[r * 0.09, 8, 6]} />
      <meshStandardMaterial color="#cbd5e1" transparent opacity={0.3} {...CLAY} />
    </mesh>
  )
}

function RainDrop({ planet, index, origin }) {
  const ref = useRef()
  const r = planet.size
  const offset = index * 0.55
  const jitterX = ((index % 3) - 1) * r * 0.18
  const jitterZ = ((index % 2) - 0.5) * r * 0.2

  useFrame((s) => {
    if (!ref.current) return
    const t = (s.clock.elapsedTime * 0.7 + offset) % 1
    ref.current.position.y = origin[1] - r * 0.35 - t * r * 0.85
    ref.current.scale.setScalar(1 - t * 0.35)
    ref.current.material.opacity = t < 0.88 ? 0.85 : 0
  })

  return (
    <mesh ref={ref} position={[origin[0] + jitterX, origin[1], origin[2] + jitterZ]}>
      <sphereGeometry args={[r * 0.06, 8, 6]} />
      <meshStandardMaterial color="#93c5fd" transparent opacity={0.85} {...CLAY_GLOSS} />
    </mesh>
  )
}

/* ══ ADVICE — sprouts, signpost, lanterns, stepping stones, arch ═══════════ */

function AdviceDecor({ planet }) {
  const swayRef = useRef()
  const r = planet.size
  const sprouts = useMemo(() => scatter(8, r * 0.97, 9), [r])
  const stones = useMemo(() => scatter(5, r * 0.99, 41, -0.25), [r])

  useFrame((s) => {
    if (swayRef.current) {
      swayRef.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.6) * 0.04
    }
  })

  return (
    <group>
      <group ref={swayRef}>
        {/* Sprouts with paired leaves */}
        {sprouts.map((p, i) => {
          const { position, quaternion } = surfaceProps(p)
          return (
            <group key={i} position={position} quaternion={quaternion}>
              <mesh position={[0, r * 0.16, 0]}>
                <cylinderGeometry args={[r * 0.022, r * 0.032, r * 0.32, 6]} />
                <meshStandardMaterial color="#15803d" {...CLAY} />
              </mesh>
              {[-1, 1].map((dir) => (
                <mesh
                  key={dir}
                  position={[dir * r * 0.1, r * 0.3, 0]}
                  rotation={[0, 0, dir * 0.9]}
                  scale={[1, 0.45, 0.6]}
                >
                  <sphereGeometry args={[r * 0.12, 10, 8]} />
                  <meshStandardMaterial color={shade(planet.color, 0.15)} {...CLAY} />
                </mesh>
              ))}
            </group>
          )
        })}
      </group>

      {/* Stepping stones — a path forward */}
      {stones.map((p, i) => {
        const { position, quaternion } = surfaceProps(p)
        return (
          <mesh key={`st${i}`} position={position} quaternion={quaternion}
                scale={[1, 0.35, 0.85]}>
            <cylinderGeometry args={[r * 0.13, r * 0.15, r * 0.12, 7]} />
            <meshStandardMaterial color="#a8a29e" {...CLAY} />
          </mesh>
        )
      })}

      {/* Signpost, offset to the side so it stays clear of the label */}
      <group position={[r * 0.55, r * 0.85, 0]} rotation={[0, 0, -0.25]}>
        <mesh position={[0, r * 0.26, 0]}>
          <cylinderGeometry args={[r * 0.035, r * 0.035, r * 0.55, 6]} />
          <meshStandardMaterial color="#92400e" {...CLAY} />
        </mesh>
        <mesh position={[r * 0.17, r * 0.42, 0]} rotation={[0, 0, -0.08]}>
          <boxGeometry args={[r * 0.4, r * 0.14, r * 0.06]} />
          <meshStandardMaterial color="#fbbf24" {...CLAY} />
        </mesh>
        <mesh position={[-r * 0.14, r * 0.24, 0]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[r * 0.32, r * 0.12, r * 0.06]} />
          <meshStandardMaterial color="#fcd34d" {...CLAY} />
        </mesh>
      </group>

      {/* Floating lanterns — shared guidance */}
      {[0, 1, 2].map((i) => {
        const a = i * 2.2
        return (
          <FloatingProp
            key={`l${i}`}
            position={new THREE.Vector3(Math.cos(a) * r * 1.8, r * (0.3 + i * 0.28), Math.sin(a) * r * 1.8)}
            speed={0.5 + i * 0.15}
            amount={0.22}
          >
            <mesh>
              <boxGeometry args={[r * 0.16, r * 0.2, r * 0.16]} />
              <meshStandardMaterial
                color="#fef3c7"
                emissive="#fbbf24"
                emissiveIntensity={0.5}
                {...CLAY}
              />
            </mesh>
            <mesh position={[0, r * 0.14, 0]}>
              <cylinderGeometry args={[r * 0.015, r * 0.015, r * 0.1, 5]} />
              <meshStandardMaterial color="#78350f" {...CLAY} />
            </mesh>
          </FloatingProp>
        )
      })}

      {/* Orbiting leaf motes */}
      <OrbitingRing count={6} radius={r * 2.15} tilt={-0.4} speed={0.22}>
        {(i) => (
          <mesh rotation={[i, i * 0.6, 0]} scale={[1, 0.3, 0.6]}>
            <sphereGeometry args={[r * 0.07, 8, 6]} />
            <meshStandardMaterial color="#6ee7b7" {...CLAY} />
          </mesh>
        )}
      </OrbitingRing>
    </group>
  )
}

/* ══ GRIEF — wilting stems, craters, cairns, broken ring, mist ═════════════ */

function GriefDecor({ planet }) {
  const r = planet.size
  const stems = useMemo(() => scatter(6, r * 0.97, 13), [r])
  const craters = useMemo(() => scatter(7, r * 0.99, 21), [r])
  const cairns = useMemo(() => scatter(3, r * 0.98, 53, -0.2), [r])

  const droopGeo = useMemo(() => makeClayTube([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, r * 0.26, r * 0.03),
    new THREE.Vector3(r * 0.06, r * 0.42, r * 0.12),
    new THREE.Vector3(r * 0.16, r * 0.44, r * 0.22),
  ], r * 0.026, 18), [r])

  return (
    <group>
      {/* Wilting stems with drooping buds */}
      {stems.map((p, i) => {
        const { position, quaternion } = surfaceProps(p)
        return (
          <group key={i} position={position} quaternion={quaternion} rotation-y={i}>
            <mesh geometry={droopGeo}>
              <meshStandardMaterial color="#4b5563" {...CLAY} />
            </mesh>
            <mesh position={[r * 0.17, r * 0.42, r * 0.23]} scale={[1, 0.7, 1]}>
              <sphereGeometry args={[r * 0.065, 10, 8]} />
              <meshStandardMaterial color={shade(planet.color, 0.2)} {...CLAY} />
            </mesh>
          </group>
        )
      })}

      {/* Pressed-in craters — the weight of loss */}
      {craters.map((p, i) => {
        const { position, quaternion } = surfaceProps(p)
        return (
          <mesh key={`c${i}`} position={position} quaternion={quaternion} scale={[1, 0.28, 1]}>
            <sphereGeometry args={[r * (0.12 + (i % 3) * 0.04), 12, 8]} />
            <meshStandardMaterial color={shade(planet.color, -0.4)} {...CLAY} />
          </mesh>
        )
      })}

      {/* Memorial cairns — stacked remembrance stones */}
      {cairns.map((p, i) => {
        const { position, quaternion } = surfaceProps(p)
        return (
          <group key={`k${i}`} position={position} quaternion={quaternion}>
            {[0, 1, 2].map((k) => (
              <mesh
                key={k}
                position={[0, r * (0.06 + k * 0.1), 0]}
                scale={[1 - k * 0.18, 0.5, 1 - k * 0.18]}
                rotation-y={k * 0.8}
              >
                <cylinderGeometry args={[r * 0.11, r * 0.12, r * 0.13, 6]} />
                <meshStandardMaterial color={shade('#64748b', -k * 0.1)} {...CLAY} />
              </mesh>
            ))}
          </group>
        )
      })}

      {/* Broken ring — something once whole */}
      <group rotation={[Math.PI / 2.2, 0, 0.5]}>
        {[0, 1].map((i) => (
          <mesh key={i} rotation={[0, 0, i * Math.PI * 1.05]}>
            <torusGeometry args={[r * 1.55, r * 0.04, 8, 40, Math.PI * 0.6]} />
            <meshStandardMaterial color={shade(planet.color, 0.1)} {...CLAY} />
          </mesh>
        ))}
      </group>

      {/* Drifting petals */}
      {[0, 1, 2, 3].map((i) => (
        <FloatingProp
          key={`p${i}`}
          position={new THREE.Vector3(
            Math.cos(i * 1.9) * r * 1.9,
            r * (0.3 + i * 0.3),
            Math.sin(i * 1.9) * r * 1.9
          )}
          speed={0.35 + i * 0.08}
          amount={0.3}
        >
          <mesh rotation={[1.2, i, 0.4]} scale={[1, 0.25, 0.55]}>
            <sphereGeometry args={[r * 0.1, 8, 6]} />
            <meshStandardMaterial color="#a5b4fc" {...CLAY} />
          </mesh>
        </FloatingProp>
      ))}
    </group>
  )
}

/* ══ ANXIETY — coils, jitter orbs, spikes, tremor rings, shards ════════════ */

function AnxietyDecor({ planet }) {
  const coilRef = useRef()
  const r = planet.size
  const spikes = useMemo(() => scatter(9, r * 0.98, 61), [r])

  const coilGeo = useMemo(() => {
    const pts = []
    const turns = 3
    const steps = 56
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const angle = t * Math.PI * 2 * turns
      const y = (t - 0.5) * r * 1.8
      const rad = r * 1.22 * Math.cos((t - 0.5) * Math.PI * 0.85)
      pts.push(new THREE.Vector3(Math.cos(angle) * rad, y, Math.sin(angle) * rad))
    }
    return makeClayTube(pts, r * 0.042, 80)
  }, [r])

  useFrame((s) => {
    if (coilRef.current) coilRef.current.rotation.y = s.clock.elapsedTime * 0.5
  })

  return (
    <group>
      {/* Tangled coil wrapping the planet */}
      <mesh ref={coilRef} geometry={coilGeo}>
        <meshStandardMaterial
          color={shade(planet.color, 0.25)}
          emissive={planet.color}
          emissiveIntensity={0.2}
          {...CLAY}
        />
      </mesh>

      {/* Jagged surface spikes — bristling tension */}
      {spikes.map((p, i) => {
        const { position, quaternion } = surfaceProps(p)
        return (
          <mesh key={`sp${i}`} position={position} quaternion={quaternion}>
            <coneGeometry args={[r * 0.07, r * 0.3 + (i % 3) * r * 0.08, 4]} />
            <meshStandardMaterial color={shade(planet.color, -0.15)} {...CLAY} />
          </mesh>
        )
      })}

      {/* Tremor rings — never quite settling */}
      {[0, 1, 2].map((i) => (
        <TremorRing key={`tr${i}`} r={r} index={i} color={planet.color} />
      ))}

      {/* Restless orbs */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <JitterOrb key={i} planet={planet} index={i} />
      ))}

      {/* Orbiting shards */}
      <OrbitingRing count={7} radius={r * 2.2} tilt={0.8} speed={0.55}>
        {(i) => (
          <mesh rotation={[i, i * 1.3, i * 0.5]}>
            <tetrahedronGeometry args={[r * 0.1, 0]} />
            <meshStandardMaterial color="#f9a8d4" {...CLAY} />
          </mesh>
        )}
      </OrbitingRing>
    </group>
  )
}

function TremorRing({ r, index, color }) {
  const ref = useRef()
  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime
    const jitter = Math.sin(t * (6 + index) + index * 2) * 0.04
    ref.current.scale.setScalar(1 + jitter)
    ref.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.7 + index) * 0.5
    ref.current.rotation.z = t * (0.2 + index * 0.1)
  })
  return (
    <mesh ref={ref}>
      <torusGeometry args={[r * (1.4 + index * 0.22), r * 0.018, 6, 40]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} depthWrite={false} />
    </mesh>
  )
}

function JitterOrb({ planet, index }) {
  const ref = useRef()
  const r = planet.size
  const base = useMemo(() => {
    const a = index * 1.15
    return new THREE.Vector3(
      Math.cos(a) * r * 1.65,
      (index - 2.5) * r * 0.3,
      Math.sin(a) * r * 1.65
    )
  }, [index, r])

  useFrame((s) => {
    if (!ref.current) return
    const t = s.clock.elapsedTime
    ref.current.position.set(
      base.x + Math.sin(t * 7 + index) * r * 0.07,
      base.y + Math.cos(t * 8.5 + index * 2) * r * 0.07,
      base.z + Math.sin(t * 6.4 + index * 3) * r * 0.07
    )
  })

  return (
    <mesh ref={ref} position={base.toArray()}>
      <sphereGeometry args={[r * 0.085, 10, 8]} />
      <meshStandardMaterial color="#fbcfe8" {...CLAY} />
    </mesh>
  )
}

/* ══ REFLECTIONS — rings, pebbles, moon, still pools, monoliths ════════════ */

function NeutralDecor({ planet }) {
  const ringRef = useRef()
  const moonRef = useRef()
  const r = planet.size
  const pebbles = useMemo(() => scatter(9, r * 0.99, 17), [r])
  const pools = useMemo(() => scatter(4, r * 0.99, 71, 0.1), [r])
  const monoliths = useMemo(() => scatter(3, r * 0.98, 89, -0.15), [r])

  useFrame((s) => {
    const t = s.clock.elapsedTime
    if (ringRef.current) ringRef.current.rotation.z = t * 0.06
    if (moonRef.current) {
      moonRef.current.position.x = Math.cos(t * 0.35) * r * 2.3
      moonRef.current.position.z = Math.sin(t * 0.35) * r * 2.3
      moonRef.current.position.y = Math.sin(t * 0.35) * r * 0.5
    }
  })

  return (
    <group>
      {/* Saturn-style double ring */}
      <group rotation={[Math.PI / 2.4, 0, 0.35]}>
        <mesh ref={ringRef}>
          <torusGeometry args={[r * 1.55, r * 0.065, 10, 60]} />
          <meshStandardMaterial color={shade(planet.color, 0.3)} {...CLAY} />
        </mesh>
        <mesh>
          <torusGeometry args={[r * 1.85, r * 0.04, 10, 60]} />
          <meshStandardMaterial color={shade(planet.color, 0.1)} {...CLAY} />
        </mesh>
      </group>

      {/* Small moon */}
      <mesh ref={moonRef} position={[r * 2.3, 0, 0]}>
        <icosahedronGeometry args={[r * 0.22, 1]} />
        <meshStandardMaterial color="#cbd5e1" {...CLAY} />
      </mesh>

      {/* Still reflecting pools */}
      {pools.map((p, i) => {
        const { position, quaternion } = surfaceProps(p)
        return (
          <mesh key={`pl${i}`} position={position} quaternion={quaternion} scale={[1, 0.12, 1]}>
            <cylinderGeometry args={[r * 0.19, r * 0.19, r * 0.1, 16]} />
            <meshStandardMaterial color="#7dd3fc" {...CLAY_GLOSS} />
          </mesh>
        )
      })}

      {/* Standing monoliths — quiet contemplation */}
      {monoliths.map((p, i) => {
        const { position, quaternion } = surfaceProps(p)
        return (
          <mesh key={`m${i}`} position={position} quaternion={quaternion}
                rotation-y={i * 1.2} position-y={position[1]}>
            <boxGeometry args={[r * 0.1, r * 0.38, r * 0.08]} />
            <meshStandardMaterial color="#94a3b8" {...CLAY} />
          </mesh>
        )
      })}

      {/* Smooth resting pebbles */}
      {pebbles.map((p, i) => {
        const { position, quaternion } = surfaceProps(p)
        return (
          <mesh key={i} position={position} quaternion={quaternion} scale={[1, 0.55, 0.8]}>
            <sphereGeometry args={[r * (0.08 + (i % 3) * 0.03), 10, 8]} />
            <meshStandardMaterial color={shade(planet.color, i % 2 ? 0.25 : -0.2)} {...CLAY} />
          </mesh>
        )
      })}
    </group>
  )
}

/* ══ DOODLE DRIFT — paintbrushes, palette, floating frames, splats ══════════ */

function DoodleDecor({ planet }) {
  const spinRef = useRef()
  const r = planet.size
  const splats = useMemo(() => scatter(6, r * 0.99, 77), [r])

  useFrame((s) => {
    if (spinRef.current) spinRef.current.rotation.y = s.clock.elapsedTime * 0.15
  })

  return (
    <group>
      <group ref={spinRef}>
        {/* Paint splats on surface */}
        {splats.map((p, i) => {
          const { position, quaternion } = surfaceProps(p)
          const splatColors = ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#FB923C']
          return (
            <mesh key={`sp${i}`} position={position} quaternion={quaternion} scale={[1, 0.2, 1]}>
              <sphereGeometry args={[r * (0.12 + (i % 3) * 0.04), 10, 8]} />
              <meshStandardMaterial color={splatColors[i % splatColors.length]} {...CLAY} />
            </mesh>
          )
        })}

        {/* Paintbrush sticking out of the surface */}
        {useMemo(() => scatter(3, r * 0.98, 91), [r]).map((p, i) => {
          const { position, quaternion } = surfaceProps(p)
          return (
            <group key={`br${i}`} position={position} quaternion={quaternion}>
              <mesh position={[0, r * 0.25, 0]}>
                <cylinderGeometry args={[r * 0.02, r * 0.025, r * 0.5, 6]} />
                <meshStandardMaterial color="#92400e" {...CLAY} />
              </mesh>
              <mesh position={[0, r * 0.48, 0]} scale={[1, 0.6, 1]}>
                <coneGeometry args={[r * 0.06, r * 0.15, 6]} />
                <meshStandardMaterial
                  color={['#F87171', '#60A5FA', '#FBBF24'][i % 3]}
                  {...CLAY}
                />
              </mesh>
            </group>
          )
        })}
      </group>

      {/* Floating picture frames */}
      {[0, 1, 2].map((i) => {
        const a = i * 2.2
        return (
          <FloatingProp
            key={`fr${i}`}
            position={new THREE.Vector3(
              Math.cos(a) * r * 2.0,
              r * (0.2 + i * 0.35),
              Math.sin(a) * r * 2.0
            )}
            speed={0.4 + i * 0.12}
            amount={0.2}
          >
            <group>
              {/* Frame border */}
              <mesh>
                <boxGeometry args={[r * 0.5, r * 0.4, r * 0.04]} />
                <meshStandardMaterial color="#78350f" {...CLAY} />
              </mesh>
              {/* Canvas inside */}
              <mesh position={[0, 0, r * 0.025]}>
                <boxGeometry args={[r * 0.38, r * 0.28, r * 0.01]} />
                <meshStandardMaterial
                  color={['#fef3c7', '#e0f2fe', '#fce7f3'][i]}
                  {...CLAY}
                />
              </mesh>
            </group>
          </FloatingProp>
        )
      })}

      {/* Orbiting colour chips */}
      <OrbitingRing count={10} radius={r * 2.3} tilt={0.6} speed={0.3}>
        {(i) => (
          <mesh>
            <boxGeometry args={[r * 0.12, r * 0.12, r * 0.04]} />
            <meshStandardMaterial
              color={['#F87171','#FB923C','#FBBF24','#A3E635','#34D399',
                      '#22D3EE','#60A5FA','#A78BFA','#F472B6','#FFFFFF'][i]}
              {...CLAY}
            />
          </mesh>
        )}
      </OrbitingRing>
    </group>
  )
}

/* ══ dispatcher ═════════════════════════════════════════════════════════════ */

const DECOR = {
  joy: JoyDecor,
  vent: VentDecor,
  advice: AdviceDecor,
  grief: GriefDecor,
  anxiety: AnxietyDecor,
  neutral: NeutralDecor,
  doodle: DoodleDecor,
}

export default function PlanetDecor({ planet }) {
  const groupRef = useRef()
  const Component = DECOR[planet.id]

  // Enable shadows in one pass. Transparent pieces are excluded so translucent
  // clay does not throw hard silhouettes.
  useEffect(() => {
    if (!groupRef.current) return
    groupRef.current.traverse((obj) => {
      if (!obj.isMesh) return
      const transparent = obj.material?.transparent
      obj.castShadow = !transparent
      obj.receiveShadow = true
    })
  }, [planet.id])

  if (!Component) return null

  return (
    <group ref={groupRef}>
      <Component planet={planet} />
    </group>
  )
}
