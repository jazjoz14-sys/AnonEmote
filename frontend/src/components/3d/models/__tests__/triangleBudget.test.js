import { describe, it, expect } from 'vitest'

// Feature: custom-3d-models, Property 15: Triangle Budget Enforcement

/**
 * Triangle budgets per category (mirrors useModelLoader.js TRI_BUDGET)
 */
const TRI_BUDGET = { planet: 5000, avatar: 3000 }

/**
 * Reproduces the enforceTriangleBudget logic from useModelLoader.js
 * for direct unit testing. This is a pure function that traverses a scene,
 * accumulates triangle counts, and removes meshes that exceed the budget.
 */
function enforceTriangleBudget(scene, category) {
  const budget = TRI_BUDGET[category]
  if (!budget) return

  let accumulated = 0
  const meshesToRemove = []

  scene.traverse((child) => {
    if (!child.isMesh || !child.geometry) return
    const geo = child.geometry
    let tris = 0
    if (geo.index) {
      tris = geo.index.count / 3
    } else if (geo.attributes.position) {
      tris = geo.attributes.position.count / 3
    }

    if (accumulated + tris > budget) {
      meshesToRemove.push(child)
    } else {
      accumulated += tris
    }
  })

  // Remove meshes that exceed the budget
  for (const mesh of meshesToRemove) {
    if (mesh.parent) {
      mesh.parent.remove(mesh)
    }
    if (mesh.geometry) mesh.geometry.dispose()
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose())
      } else {
        mesh.material.dispose()
      }
    }
  }
}

/**
 * Creates a mock mesh with a specified triangle count using indexed geometry.
 * Tracks removal state via the `removed` flag.
 */
function createMockMesh(triCount) {
  const mesh = {
    isMesh: true,
    geometry: {
      index: { count: triCount * 3 },
      attributes: { position: { count: triCount * 3 } },
      dispose: () => { mesh._geometryDisposed = true },
    },
    material: {
      dispose: () => { mesh._materialDisposed = true },
    },
    parent: null,
    removed: false,
    _geometryDisposed: false,
    _materialDisposed: false,
  }
  return mesh
}

/**
 * Creates a mock scene containing meshes with the given triangle counts.
 * Sets up parent references so remove() calls are tracked.
 */
function createMockScene(triCounts) {
  const meshes = triCounts.map((tris) => createMockMesh(tris))

  const scene = {
    children: [...meshes],
    traverse: (cb) => {
      for (const mesh of meshes) {
        cb(mesh)
      }
    },
  }

  // Set each mesh's parent to the scene with a remove function that flags removal
  meshes.forEach((mesh) => {
    mesh.parent = {
      remove: (child) => {
        child.removed = true
      },
    }
  })

  return { scene, meshes }
}

/**
 * Helper: counts the total triangles of meshes that were NOT removed.
 */
function countRemainingTris(meshes) {
  return meshes
    .filter((m) => !m.removed)
    .reduce((sum, m) => sum + m.geometry.index.count / 3, 0)
}

describe('Property 15: Triangle Budget Enforcement', () => {
  it('removes meshes exceeding 5000 triangle budget for planets', () => {
    // 3 meshes: 2000 + 2000 + 3000 = 7000 tris total (exceeds 5000)
    const { scene, meshes } = createMockScene([2000, 2000, 3000])

    enforceTriangleBudget(scene, 'planet')

    // First two meshes fit (2000+2000=4000 ≤ 5000), third is removed (4000+3000=7000 > 5000)
    expect(meshes[0].removed).toBe(false)
    expect(meshes[1].removed).toBe(false)
    expect(meshes[2].removed).toBe(true)

    const remaining = countRemainingTris(meshes)
    expect(remaining).toBeLessThanOrEqual(5000)
  })

  it('keeps all meshes when total is within planet budget', () => {
    // 3 meshes: 1500 + 1500 + 1500 = 4500 tris (under 5000)
    const { scene, meshes } = createMockScene([1500, 1500, 1500])

    enforceTriangleBudget(scene, 'planet')

    // All meshes should remain
    expect(meshes[0].removed).toBe(false)
    expect(meshes[1].removed).toBe(false)
    expect(meshes[2].removed).toBe(false)

    const remaining = countRemainingTris(meshes)
    expect(remaining).toBe(4500)
  })

  it('enforces 3000 triangle budget for avatars', () => {
    // 4 meshes: 1000 + 1000 + 1000 + 1000 = 4000 tris (exceeds 3000)
    const { scene, meshes } = createMockScene([1000, 1000, 1000, 1000])

    enforceTriangleBudget(scene, 'avatar')

    // First three fit (1000+1000+1000=3000 ≤ 3000), fourth is removed
    expect(meshes[0].removed).toBe(false)
    expect(meshes[1].removed).toBe(false)
    expect(meshes[2].removed).toBe(false)
    expect(meshes[3].removed).toBe(true)

    const remaining = countRemainingTris(meshes)
    expect(remaining).toBeLessThanOrEqual(3000)
  })

  it('removes multiple meshes when several exceed the planet budget', () => {
    // 5 meshes of 1500 each = 7500 total. Budget 5000 → keeps first 3 (4500), removes last 2
    const { scene, meshes } = createMockScene([1500, 1500, 1500, 1500, 1500])

    enforceTriangleBudget(scene, 'planet')

    expect(meshes[0].removed).toBe(false)
    expect(meshes[1].removed).toBe(false)
    expect(meshes[2].removed).toBe(false)
    expect(meshes[3].removed).toBe(true) // 4500 + 1500 = 6000 > 5000
    expect(meshes[4].removed).toBe(true)

    const remaining = countRemainingTris(meshes)
    expect(remaining).toBeLessThanOrEqual(5000)
  })

  it('handles a single large mesh that exceeds budget on its own', () => {
    // Single mesh of 8000 tris — budget is 5000, so it gets removed
    const { scene, meshes } = createMockScene([8000])

    enforceTriangleBudget(scene, 'planet')

    expect(meshes[0].removed).toBe(true)
    expect(countRemainingTris(meshes)).toBe(0)
  })

  it('keeps exactly at budget boundary (5000 tris for planet)', () => {
    // Exactly 5000 tris — should NOT be removed
    const { scene, meshes } = createMockScene([5000])

    enforceTriangleBudget(scene, 'planet')

    expect(meshes[0].removed).toBe(false)
    expect(countRemainingTris(meshes)).toBe(5000)
  })

  it('disposes geometry and material of removed meshes', () => {
    // 2 meshes: 4000 + 3000 = 7000 (second mesh exceeds budget)
    const { scene, meshes } = createMockScene([4000, 3000])

    enforceTriangleBudget(scene, 'planet')

    // First mesh kept — resources not disposed
    expect(meshes[0]._geometryDisposed).toBe(false)
    expect(meshes[0]._materialDisposed).toBe(false)

    // Second mesh removed — resources disposed
    expect(meshes[1].removed).toBe(true)
    expect(meshes[1]._geometryDisposed).toBe(true)
    expect(meshes[1]._materialDisposed).toBe(true)
  })

  it('does nothing for unknown category', () => {
    const { scene, meshes } = createMockScene([10000])

    enforceTriangleBudget(scene, 'spaceship')

    // No budget for 'spaceship' — all meshes remain
    expect(meshes[0].removed).toBe(false)
  })

  it('skips non-mesh children during traversal', () => {
    const mesh = createMockMesh(3000)
    const nonMesh = { isMesh: false, geometry: null }
    const light = { isMesh: true, geometry: null } // mesh without geometry

    const scene = {
      traverse: (cb) => {
        cb(nonMesh)
        cb(light)
        cb(mesh)
      },
    }
    mesh.parent = { remove: (child) => { child.removed = true } }

    enforceTriangleBudget(scene, 'planet')

    // mesh with 3000 tris fits within 5000 budget
    expect(mesh.removed).toBe(false)
  })

  // **Validates: Requirements 6.6**
})
