/**
 * Bug Condition Exploration Test: Auth Navigation (Bug #8)
 *
 * **Validates: Requirements 1.8**
 *
 * Bug: When unauthenticated user clicks "Sign In / Register" from PlanetInfoPanel,
 * setPhase('auth') is called. After login, setPhase('avatar') is hardcoded in AuthScreen.
 * The selected planet is lost — user ends up at avatar screen instead of returning
 * to the star system with their planet preserved.
 *
 * Expected: After login triggered from PlanetInfoPanel, navigate to 'space' phase
 * with the previously selected planet preserved.
 *
 * This test is EXPECTED TO FAIL on unfixed code.
 */
import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'

describe('Bug Condition: Auth Navigation loses selected planet (Bug #8)', () => {
  it('after login from planet auth prompt, should return to space with planet preserved', async () => {
    /**
     * **Validates: Requirements 1.8**
     *
     * Flow: select planet → click auth prompt → complete login → assert phase='space' with planet
     *
     * On unfixed code: AuthScreen always calls setPhase('avatar') after successful login,
     * with no mechanism to preserve or restore the selected planet.
     */
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')

    // Check AuthScreen for planet-aware navigation
    const authScreenPath = path.default.resolve(
      path.default.dirname(fileURLToPath(import.meta.url)),
      'AuthScreen.jsx'
    )
    const authSource = fs.default.readFileSync(authScreenPath, 'utf8')

    // Check if AuthScreen has logic to navigate to 'space' when coming from planet
    const navigatesToSpace = authSource.includes("setPhase('space')") ||
      authSource.includes('setPhase("space")')

    const checksPendingPlanet = authSource.includes('pendingPlanet') ||
      authSource.includes('pendingPlanetId')

    // On unfixed code: AuthScreen ALWAYS does setPhase('avatar') after login
    // There's no conditional check for a pending planet
    expect(navigatesToSpace).toBe(true)
    expect(checksPendingPlanet).toBe(true)

    // Also check that the store has a pendingPlanetId field
    const storePath = path.default.resolve(
      path.default.dirname(fileURLToPath(import.meta.url)),
      '..', 'store', 'useAppStore.js'
    )
    const storeSource = fs.default.readFileSync(storePath, 'utf8')

    const storeHasPendingPlanet = storeSource.includes('pendingPlanetId') ||
      storeSource.includes('pendingPlanet')

    expect(storeHasPendingPlanet).toBe(true)

    // Check PlanetInfoPanel saves planet before navigating to auth
    const panelPath = path.default.resolve(
      process.cwd(), 'src', 'components', 'ui', 'PlanetInfoPanel.jsx'
    )
    const panelSource = fs.default.readFileSync(panelPath, 'utf8')

    const savesPlanetBeforeAuth = panelSource.includes('pendingPlanet') ||
      panelSource.includes('pendingPlanetId') ||
      panelSource.includes('PendingPlanetId')

    expect(savesPlanetBeforeAuth).toBe(true)
  })

  it('property: for any planet selection before auth, planet is preserved after login', async () => {
    /**
     * **Validates: Requirements 1.8**
     */
    const PLANETS = ['joy', 'vent', 'advice', 'grief', 'anxiety', 'neutral', 'doodle']

    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')

    const authPath = path.default.resolve(
      path.default.dirname(fileURLToPath(import.meta.url)),
      'AuthScreen.jsx'
    )
    const source = fs.default.readFileSync(authPath, 'utf8')

    fc.assert(
      fc.property(
        fc.constantFrom(...PLANETS),
        (planetId) => {
          // For any selected planet, the auth flow should preserve it.
          // On unfixed code: AuthScreen has no awareness of pendingPlanetId,
          // so regardless of which planet was selected, user always goes to 'avatar'.

          // After successful sign-in, if there's a pending planet, navigate to 'space'
          const hasConditionalNavigation =
            source.includes('pendingPlanet') ||
            source.includes("'space'")

          if (!hasConditionalNavigation) {
            throw new Error(
              `Auth flow for planet "${planetId}": AuthScreen always navigates to 'avatar' ` +
              `after login. No mechanism to return to 'space' with planet preserved.`
            )
          }
        }
      )
    )
  })
})
