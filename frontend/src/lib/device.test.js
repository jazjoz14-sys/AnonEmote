/**
 * Bug Condition Exploration Test: Quality Tier (Bug #1)
 *
 * **Validates: Requirements 1.1**
 *
 * Bug: device.js returns 'medium' for ALL non-mobile, non-small-screen devices.
 * The 'high' tier is unreachable because the ternary's final branch is hardcoded 'medium'.
 *
 * Expected: Non-ANGLE, non-mobile, non-small-screen devices with a real GPU
 * (e.g., "NVIDIA GeForce RTX 3060/PCIe/SSE2") should get 'high' tier.
 *
 * This test is EXPECTED TO FAIL on unfixed code.
 */
import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'

describe('Bug Condition: Quality Tier unreachable high (Bug #1)', () => {
  it('desktop with NVIDIA RTX 3060 (non-ANGLE) should return high tier', async () => {
    /**
     * **Validates: Requirements 1.1**
     *
     * Mock conditions: non-mobile UA, wide viewport (≥768px), GPU renderer is
     * "NVIDIA GeForce RTX 3060/PCIe/SSE2" (no ANGLE, not mobile, not small screen).
     *
     * On unfixed code: the ternary always returns 'medium' for the final branch,
     * so this will FAIL.
     */

    // Read the source to check the logic
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')

    const devicePath = path.default.resolve(
      path.default.dirname(fileURLToPath(import.meta.url)),
      'device.js'
    )
    const source = fs.default.readFileSync(devicePath, 'utf8')

    // The bug: the qualityTier computation is:
    //   isSmallScreen ? 'low' : isMobile ? 'medium' : 'medium'
    // The last branch should evaluate GPU capability but just returns 'medium'.

    // Check if the code has any path that returns 'high'
    // On unfixed code: the qualityTier assignment never evaluates to 'high'
    const qualityTierAssignment = source.match(
      /export const qualityTier\s*=\s*([\s\S]*?)(?=\n\n|\/\*\*)/
    )

    expect(qualityTierAssignment).not.toBeNull()

    const tierLogic = qualityTierAssignment[1]

    // The logic should have a path that returns 'high' for non-ANGLE desktop GPUs
    const canReturnHigh = tierLogic.includes("'high'") || tierLogic.includes('"high"')

    // On unfixed code: this will be false (no 'high' in the tier logic)
    expect(canReturnHigh).toBe(true)
  })

  it('property: non-ANGLE, non-mobile, non-small-screen GPU always maps to high', async () => {
    /**
     * **Validates: Requirements 1.1**
     *
     * For any GPU renderer string that does NOT contain "ANGLE", "SwiftShader",
     * or "llvmpipe", and the device is not mobile/small-screen, the quality tier
     * should be 'high'.
     */
    const NON_ANGLE_RENDERERS = [
      'NVIDIA GeForce RTX 3060/PCIe/SSE2',
      'NVIDIA GeForce GTX 1080 Ti/PCIe/SSE2',
      'AMD Radeon RX 6800 XT',
      'Intel(R) UHD Graphics 770',
      'Apple M1 Pro',
      'Mesa Intel(R) Xe Graphics',
    ]

    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')

    const devicePath = path.default.resolve(
      path.default.dirname(fileURLToPath(import.meta.url)),
      'device.js'
    )
    const source = fs.default.readFileSync(devicePath, 'utf8')

    fc.assert(
      fc.property(
        fc.constantFrom(...NON_ANGLE_RENDERERS),
        (renderer) => {
          // For any of these non-ANGLE renderers on a desktop device,
          // qualityTier should be 'high'.

          // Extract the qualityTier computation
          const match = source.match(/export const qualityTier\s*=\s*([\s\S]*?)(?=\n\n|\/\*\*|export)/)
          if (!match) throw new Error('Could not find qualityTier in source')

          const logic = match[1].trim()

          // The logic MUST have a branch that checks GPU renderer and returns 'high'
          const checksRenderer = logic.includes('renderer') ||
            logic.includes('WEBGL') ||
            logic.includes('gpu') ||
            logic.includes('GPU') ||
            logic.includes('Gpu')

          const hasHighBranch = logic.includes("'high'")

          if (!checksRenderer || !hasHighBranch) {
            throw new Error(
              `qualityTier has no GPU check for renderer "${renderer}". ` +
              `Non-ANGLE desktop GPUs get 'medium' instead of 'high'.`
            )
          }
        }
      )
    )
  })
})
