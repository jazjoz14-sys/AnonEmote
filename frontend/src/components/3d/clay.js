import * as THREE from 'three'

/**
 * Shared helpers for the claymation look.
 *
 * The aesthetic depends on three things: very high roughness with zero
 * metalness so light diffuses instead of glinting, slightly irregular surfaces
 * so shapes read as hand-pressed rather than machined, and soft ambient fill so
 * shadow sides stay readable like a photographed model.
 */

/** Base material properties for any clay surface. */
export const CLAY = {
  roughness: 0.95,
  metalness: 0.0,
  flatShading: false,
}

/** Slightly shinier clay — used for glaze-like accents such as water drops. */
export const CLAY_GLOSS = {
  roughness: 0.35,
  metalness: 0.0,
}

/* ── Deterministic pseudo-noise ────────────────────────────────────────────
   Seeded so every planet keeps the same lumps between renders instead of
   reshaping on each mount.                                                  */

function hash(x, y, z, seed) {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 43.3) * 43758.5453123
  return n - Math.floor(n)
}

function smoothNoise(x, y, z, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z)
  const fx = x - ix, fy = y - iy, fz = z - iz

  // Smoothstep weights
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const uz = fz * fz * (3 - 2 * fz)

  const lerp = (a, b, t) => a + (b - a) * t

  const c000 = hash(ix, iy, iz, seed)
  const c100 = hash(ix + 1, iy, iz, seed)
  const c010 = hash(ix, iy + 1, iz, seed)
  const c110 = hash(ix + 1, iy + 1, iz, seed)
  const c001 = hash(ix, iy, iz + 1, seed)
  const c101 = hash(ix + 1, iy, iz + 1, seed)
  const c011 = hash(ix, iy + 1, iz + 1, seed)
  const c111 = hash(ix + 1, iy + 1, iz + 1, seed)

  return lerp(
    lerp(lerp(c000, c100, ux), lerp(c010, c110, ux), uy),
    lerp(lerp(c001, c101, ux), lerp(c011, c111, ux), uy),
    uz
  )
}

/**
 * Build a lumpy sphere that looks pressed by hand.
 *
 * @param {number} radius
 * @param {number} detail       icosahedron subdivision (3–4 is plenty)
 * @param {number} lumpiness    displacement amount as a fraction of radius
 * @param {number} seed         keeps each planet's shape stable and distinct
 */
export function makeClayBlob(radius, detail = 4, lumpiness = 0.06, seed = 1) {
  const geo = new THREE.IcosahedronGeometry(radius, detail)
  const pos = geo.attributes.position
  const v = new THREE.Vector3()

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const dir = v.clone().normalize()

      // Two frequencies: broad dents plus finer thumb-press texture
    const broad = smoothNoise(dir.x * 2.2, dir.y * 2.2, dir.z * 2.2, seed) - 0.5
    const fine = smoothNoise(dir.x * 6.0, dir.y * 6.0, dir.z * 6.0, seed + 7) - 0.5

    const offset = 1 + (broad * 1.0 + fine * 0.35) * lumpiness * 2
    v.copy(dir).multiplyScalar(radius * offset)
    pos.setXYZ(i, v.x, v.y, v.z)
  }

  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

/**
 * Rounded "clay snake" along a curve — used for spirals, stems and coils.
 */
export function makeClayTube(points, tubeRadius = 0.06, segments = 48) {
  const curve = new THREE.CatmullRomCurve3(points)
  return new THREE.TubeGeometry(curve, segments, tubeRadius, 8, false)
}

/** Darken or lighten a hex colour — for clay shadow/highlight variants. */
export function shade(hex, amount) {
  const c = new THREE.Color(hex)
  if (amount >= 0) c.lerp(new THREE.Color('#ffffff'), amount)
  else c.lerp(new THREE.Color('#000000'), -amount)
  return `#${c.getHexString()}`
}
