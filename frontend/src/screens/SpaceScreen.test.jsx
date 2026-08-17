/**
 * Bug Condition Exploration Test: Loading State (Bug #7)
 *
 * **Validates: Requirements 1.7**
 *
 * Bug: SpaceScreen immediately shows "No posts yet. Be the first to share."
 * instead of a loading indicator while posts are being fetched.
 *
 * Expected: A loading indicator should be shown until fetchPosts resolves.
 *
 * This test is EXPECTED TO FAIL on unfixed code.
 */
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('Bug Condition: SpaceScreen missing loading state (Bug #7)', () => {
  it('should have a loading state before posts fetch resolves', () => {
    /**
     * **Validates: Requirements 1.7**
     *
     * Check that SpaceScreen introduces a loading state.
     * On unfixed code: there is NO postsLoading state variable —
     * the component immediately renders PlanetInfoPanel which shows
     * the empty-state message before fetch completes.
     */
    const spaceScreenPath = resolve(__dirname, 'SpaceScreen.jsx')
    const source = readFileSync(spaceScreenPath, 'utf8')

    // Check if SpaceScreen has a loading state
    const hasLoadingState = source.includes('postsLoading') ||
      (source.includes('loading') && /useState\(true\)/.test(source))

    // On unfixed code: there is NO loading state variable
    expect(hasLoadingState).toBe(true)
  })

  it('PlanetInfoPanel should handle loading prop to show indicator', () => {
    /**
     * **Validates: Requirements 1.7**
     *
     * Check that PlanetInfoPanel receives and uses a loading prop
     * to show an indicator instead of "No posts yet".
     */
    const panelPath = resolve(__dirname, '..', 'components', 'ui', 'PlanetInfoPanel.jsx')
    const source = readFileSync(panelPath, 'utf8')

    // Check if PlanetInfoPanel handles a loading state
    const handlesLoading = source.includes('postsLoading') ||
      source.includes('isLoading') ||
      (source.includes('loading') && source.includes('Loading'))

    // On unfixed code: PlanetInfoPanel has no loading prop or state
    // It always renders "No posts yet" when planetPosts.length === 0
    expect(handlesLoading).toBe(true)
  })
})
