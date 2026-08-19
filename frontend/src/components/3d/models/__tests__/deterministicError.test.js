import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Feature: custom-3d-models, Property 4: Deterministic Error Immediate Fallback
// **Validates: Requirements 3.5**

// Mock GLTFLoader — capture the load function so tests can control callbacks
let mockLoadImpl = vi.fn()
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    load(...args) {
      return mockLoadImpl(...args)
    }
  },
}))

// Mock tierConfig to avoid device detection issues in test env
vi.mock('../tierConfig.js', () => ({
  adaptMaterials: vi.fn(),
  qualityTier: 'medium',
}))

// Mock modelPaths to return predictable paths
vi.mock('../modelPaths.js', () => ({
  getModelPath: (id, category) => `/models/${category}s/${id}.glb`,
}))

describe('Property 4: Deterministic Error Immediate Fallback', () => {
  let warnSpy

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    // Reset the mock load implementation for each test
    mockLoadImpl = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('404 error triggers immediate ERROR state without waiting for timeout', async () => {
    // Mock performance.now to control elapsed time measurement
    let nowValue = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => nowValue)

    // GLTFLoader calls error callback synchronously (simulating a 404)
    mockLoadImpl.mockImplementation((path, onLoad, onProgress, onError) => {
      nowValue = 1050 // 50ms elapsed
      onError(new Error('404 Not Found'))
    })

    const { useModelLoader } = await import('../useModelLoader.js')

    let result
    act(() => {
      result = renderHook(() => useModelLoader('joy', 'planet'))
    })

    // State should be ERROR (not TIMEOUT)
    expect(result.result.current.error).not.toBeNull()
    expect(result.result.current.error.code).toBe('LOAD_ERROR')
    expect(result.result.current.scene).toBeNull()
    expect(result.result.current.loaded).toBe(false)

    // Advancing time past the 10s timeout should NOT trigger TIMEOUT
    // because the timeout was cleared on the deterministic error
    act(() => {
      vi.advanceTimersByTime(15000)
    })

    // Still ERROR, not TIMEOUT — timeout was cleared
    expect(result.result.current.error.code).toBe('LOAD_ERROR')
    expect(result.result.current.scene).toBeNull()
  })

  it('parse error triggers immediate ERROR state', async () => {
    let nowValue = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => nowValue)

    mockLoadImpl.mockImplementation((path, onLoad, onProgress, onError) => {
      nowValue = 1030 // 30ms elapsed
      onError(new Error('Unexpected token in JSON at position 0'))
    })

    const { useModelLoader } = await import('../useModelLoader.js')

    let result
    act(() => {
      result = renderHook(() => useModelLoader('grief', 'planet'))
    })

    expect(result.result.current.error).not.toBeNull()
    expect(result.result.current.error.code).toBe('LOAD_ERROR')
    expect(result.result.current.error.message).toContain('Unexpected token')
    expect(result.result.current.scene).toBeNull()
    expect(result.result.current.loaded).toBe(false)
  })

  it('4xx client error triggers immediate ERROR state', async () => {
    let nowValue = 1000
    vi.spyOn(performance, 'now').mockImplementation(() => nowValue)

    mockLoadImpl.mockImplementation((path, onLoad, onProgress, onError) => {
      nowValue = 1020 // 20ms elapsed
      onError(new Error('403 Forbidden'))
    })

    const { useModelLoader } = await import('../useModelLoader.js')

    let result
    act(() => {
      result = renderHook(() => useModelLoader('orb', 'avatar'))
    })

    expect(result.result.current.error).not.toBeNull()
    expect(result.result.current.error.code).toBe('LOAD_ERROR')
    expect(result.result.current.scene).toBeNull()
    expect(result.result.current.loaded).toBe(false)
  })

  it('elapsed time on deterministic error is less than the timeout duration', async () => {
    let nowValue = 2000
    vi.spyOn(performance, 'now').mockImplementation(() => nowValue)

    mockLoadImpl.mockImplementation((path, onLoad, onProgress, onError) => {
      nowValue = 2050 // 50ms elapsed — well under the 10s timeout
      onError(new Error('404 Not Found'))
    })

    const { useModelLoader } = await import('../useModelLoader.js')

    let result
    act(() => {
      result = renderHook(() =>
        useModelLoader('anxiety', 'planet', { timeout: 10000 })
      )
    })

    expect(result.result.current.error).not.toBeNull()
    expect(result.result.current.error.code).toBe('LOAD_ERROR')

    // Console.warn should have been called with elapsed time of 50ms (< 10000ms timeout)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('50ms')
    )
  })

  it('console.warn is called with correct format on deterministic error', async () => {
    let nowValue = 5000
    vi.spyOn(performance, 'now').mockImplementation(() => nowValue)

    mockLoadImpl.mockImplementation((path, onLoad, onProgress, onError) => {
      nowValue = 5100 // 100ms elapsed
      onError(new Error('net::ERR_CONNECTION_REFUSED'))
    })

    const { useModelLoader } = await import('../useModelLoader.js')

    act(() => {
      renderHook(() => useModelLoader('vent', 'planet'))
    })

    // Verify the warning format: [ModelLoader] Failed to load {category}/{id}.glb: {message} ({elapsed}ms)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(
        /\[ModelLoader\] Failed to load planet\/vent\.glb: .+ \(\d+ms\)/
      )
    )
  })
})
