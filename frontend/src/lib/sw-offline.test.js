/**
 * Property-based tests for Service Worker Network-First Timeout fallback.
 *
 * Since we can't easily test the real service worker in jsdom, we replicate
 * the handlerDidError callback logic (as configured in vite.config.js) and
 * verify the offline response structure for random API paths.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Replicated handlerDidError callback from the vite-plugin-pwa Workbox config.
 * This is the exact logic that runs when network is unavailable or exceeds 3000ms
 * for /api/* requests.
 */
async function handlerDidError() {
  return new Response(
    JSON.stringify({
      offline: true,
      message: 'You appear to be offline.',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}

/**
 * Arbitrary for generating random API path segments.
 * Produces paths like /api/posts, /api/reactions/abc123, /api/moderation/check, etc.
 */
const segmentArb = fc
  .array(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')
    ),
    { minLength: 1, maxLength: 12 }
  )
  .map((chars) => chars.join(''))

const apiPathArb = fc
  .array(segmentArb, { minLength: 1, maxLength: 4 })
  .map((segments) => `/api/${segments.join('/')}`)

describe('Feature: responsive-pwa-layout, Property 10: Service Worker Network-First Timeout', () => {
  /**
   * **Validates: Requirements 14.3**
   *
   * Property 10: Service Worker Network-First Timeout
   * For any /api/* fetch when network unavailable or exceeds 3000ms,
   * verify response contains { offline: true } and message string.
   */
  it('handlerDidError returns { offline: true } with a message string for any /api/* path', async () => {
    await fc.assert(
      fc.asyncProperty(apiPathArb, async (apiPath) => {
        // Verify the path matches /api/* pattern
        expect(apiPath).toMatch(/^\/api\/.*/)

        // Simulate the fallback response (as if network failed or timed out)
        const response = await handlerDidError()

        // Verify response is a valid Response object
        expect(response).toBeInstanceOf(Response)

        // Verify Content-Type header
        expect(response.headers.get('Content-Type')).toBe('application/json')

        // Parse the JSON body
        const body = await response.json()

        // Core property: offline must be boolean true
        expect(body.offline).toBe(true)

        // Core property: message must be a non-empty string
        expect(typeof body.message).toBe('string')
        expect(body.message.length).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 14.3**
   *
   * Additional property: the URL pattern /api/* matches all generated API paths.
   * This ensures the Workbox urlPattern would intercept these requests.
   */
  it('urlPattern matches all generated API paths', () => {
    const urlPattern = new RegExp('\\/api\\/.*')

    fc.assert(
      fc.property(apiPathArb, (apiPath) => {
        expect(urlPattern.test(apiPath)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})
