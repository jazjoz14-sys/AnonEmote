import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Feature: custom-3d-models, Property 3: Fallback on Load Failure

// Capture the load callbacks so we can trigger them in tests
let capturedCallbacks = {}

vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => {
  class MockGLTFLoader {
    load(url, onLoad, onProgress, onError) {
      capturedCallbacks = { url, onLoad, onProgress, onError }
    }
  }
  return { GLTFLoader: MockGLTFLoader }
})

vi.mock('../tierConfig.js', () => ({
  getCurrentTier: () => 'high',
  adaptMaterials: vi.fn(),
  TIER_MATERIAL_CONFIG: {
    low: { useTextures: false, flatColorFallback: true },
    medium: { useTextures: true, useNormalMaps: false },
    high: { useTextures: true, useNormalMaps: true },
  },
}))

vi.mock('../../../../lib/device.js', () => ({
  qualityTier: 'high',
}))

// Import after mocks are set up
const { useModelLoader, LoadState } = await import('../useModelLoader.js')

describe('Property 3: Fallback on Load Failure', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    capturedCallbacks = {}
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns scene: null and error on 404 Not Found', () => {
    const { result } = renderHook(() => useModelLoader('joy', 'planet'))

    // Initially in loading state
    expect(result.current.loaded).toBe(false)
    expect(result.current.scene).toBeNull()

    // Trigger the error callback (simulates GLTFLoader returning 404)
    act(() => {
      const err = new Error('404 Not Found')
      err.status = 404
      capturedCallbacks.onError(err)
    })

    expect(result.current.scene).toBeNull()
    expect(result.current.loaded).toBe(false)
    expect(result.current.error).not.toBeNull()
    expect(result.current.error.message).toContain('404')
  })

  it('returns scene: null and error on network failure', () => {
    const { result } = renderHook(() => useModelLoader('vent', 'planet'))

    act(() => {
      const err = new Error('net::ERR_CONNECTION_REFUSED')
      err.code = 'NETWORK_ERROR'
      capturedCallbacks.onError(err)
    })

    expect(result.current.scene).toBeNull()
    expect(result.current.loaded).toBe(false)
    expect(result.current.error).not.toBeNull()
    expect(result.current.error.message).toContain('ERR_CONNECTION_REFUSED')
  })

  it('returns scene: null and error on GLB parse error', () => {
    const { result } = renderHook(() => useModelLoader('grief', 'planet'))

    act(() => {
      const err = new Error('Invalid glTF: unexpected token at offset 0')
      err.code = 'PARSE_ERROR'
      capturedCallbacks.onError(err)
    })

    expect(result.current.scene).toBeNull()
    expect(result.current.loaded).toBe(false)
    expect(result.current.error).not.toBeNull()
    expect(result.current.error.message).toContain('Invalid glTF')
  })

  it('returns scene: null and error on timeout (10s)', () => {
    const { result } = renderHook(() => useModelLoader('anxiety', 'planet'))

    // Initially loading — no error yet
    expect(result.current.error).toBeNull()
    expect(result.current.loaded).toBe(false)

    // Advance timer past the 10s timeout (loader never responds)
    act(() => {
      vi.advanceTimersByTime(10001)
    })

    expect(result.current.scene).toBeNull()
    expect(result.current.loaded).toBe(false)
    expect(result.current.error).not.toBeNull()
    expect(result.current.error.code).toBe('TIMEOUT')
  })

  it('returns scene: null when error is a string (non-Error object)', () => {
    // GLTFLoader sometimes passes a string instead of an Error object
    const { result } = renderHook(() => useModelLoader('neutral', 'planet'))

    act(() => {
      capturedCallbacks.onError('Failed to fetch resource')
    })

    expect(result.current.scene).toBeNull()
    expect(result.current.loaded).toBe(false)
    expect(result.current.error).not.toBeNull()
    expect(result.current.error.message).toContain('Failed to fetch resource')
  })

  it('fallback state contract holds for avatar category', () => {
    const { result } = renderHook(() => useModelLoader('orb', 'avatar'))

    act(() => {
      const err = new Error('HTTP 403 Forbidden')
      capturedCallbacks.onError(err)
    })

    expect(result.current.scene).toBeNull()
    expect(result.current.loaded).toBe(false)
    expect(result.current.error).not.toBeNull()
    expect(result.current.error.message).toContain('403')
  })

  it('scene is null enables procedural fallback rendering without exception', () => {
    const { result } = renderHook(() => useModelLoader('advice', 'planet'))

    act(() => {
      const err = new Error('Network error')
      capturedCallbacks.onError(err)
    })

    // Simulate what a component would do with the fallback state:
    // Rendering the fallback when scene === null should not throw
    const renderFallback = () => {
      const { scene, loaded, error } = result.current
      if (!loaded && error) {
        // This is the fallback path — caller renders makeClayBlob() here
        // The contract is: scene is null, loaded is false, error is set
        return { useFallback: true, scene, loaded, error: error.message }
      }
      return { useFallback: false }
    }

    expect(() => renderFallback()).not.toThrow()
    const fallbackResult = renderFallback()
    expect(fallbackResult.useFallback).toBe(true)
    expect(fallbackResult.scene).toBeNull()
    expect(fallbackResult.loaded).toBe(false)
    expect(fallbackResult.error).toBe('Network error')
  })

  // **Validates: Requirements 1.6, 2.6, 3.1, 3.2**
})
