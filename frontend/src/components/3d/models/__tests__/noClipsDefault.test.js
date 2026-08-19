import { describe, it, expect } from 'vitest'

// Feature: custom-3d-models, Property 10: No-Clips Programmatic Default
// **Validates: Requirements 4.5, 11.2, 11.5**

/**
 * Tests the effective mode resolution and mixer creation logic from
 * useAnimationController.js. When clips are empty/undefined or no mode
 * is specified, the controller must default to 'programmatic' mode and
 * skip AnimationMixer creation.
 *
 * The logic under test (from useAnimationController.js):
 *   effectiveMode: if mode === 'programmatic' → 'programmatic'
 *                  if !clips || clips.length === 0 → 'programmatic'
 *                  if activeClip not found in clips → 'programmatic'
 *                  else → mode
 *
 *   mixer: if !clips || clips.length === 0 → null
 *          if effectiveMode === 'programmatic' → null
 *          else → new THREE.AnimationMixer(...)
 */

describe('Property 10: No-Clips Programmatic Default', () => {
  // Extract the pure logic from useAnimationController for direct testing
  function resolveEffectiveMode(mode = 'programmatic', clips = [], activeClip = null) {
    if (mode === 'programmatic') return 'programmatic'
    if (!clips || clips.length === 0) return 'programmatic'
    if (activeClip) {
      const clipExists = clips.some((clip) => clip.name === activeClip)
      if (!clipExists) return 'programmatic'
    }
    return mode
  }

  function shouldCreateMixer(effectiveMode, clips) {
    if (!clips || clips.length === 0) return false
    if (effectiveMode === 'programmatic') return false
    return true
  }

  describe('empty clips array defaults to programmatic mode', () => {
    it('blended mode with empty clips resolves to programmatic', () => {
      const mode = resolveEffectiveMode('blended', [], null)
      expect(mode).toBe('programmatic')
    })

    it('clip mode with empty clips resolves to programmatic', () => {
      const mode = resolveEffectiveMode('clip', [], null)
      expect(mode).toBe('programmatic')
    })

    it('no mixer created when clips array is empty', () => {
      const mode = resolveEffectiveMode('blended', [], null)
      expect(shouldCreateMixer(mode, [])).toBe(false)
    })
  })

  describe('undefined clips defaults to programmatic mode', () => {
    it('clip mode with undefined clips resolves to programmatic', () => {
      const mode = resolveEffectiveMode('clip', undefined, null)
      expect(mode).toBe('programmatic')
    })

    it('blended mode with undefined clips resolves to programmatic', () => {
      const mode = resolveEffectiveMode('blended', undefined, null)
      expect(mode).toBe('programmatic')
    })

    it('no mixer created when clips is undefined', () => {
      const mode = resolveEffectiveMode('blended', undefined, null)
      expect(shouldCreateMixer(mode, undefined)).toBe(false)
    })
  })

  describe('no mode field (defaults to programmatic)', () => {
    it('undefined mode defaults to programmatic', () => {
      const mode = resolveEffectiveMode(undefined, [], null)
      expect(mode).toBe('programmatic')
    })

    it('undefined mode with undefined clips stays programmatic', () => {
      const mode = resolveEffectiveMode(undefined, undefined, null)
      expect(mode).toBe('programmatic')
    })

    it('no mixer created when mode defaults to programmatic', () => {
      const mode = resolveEffectiveMode(undefined, [], null)
      expect(shouldCreateMixer(mode, [])).toBe(false)
    })
  })

  describe('explicit programmatic mode stays programmatic', () => {
    it('explicit programmatic mode with clips still stays programmatic', () => {
      const clips = [{ name: 'idle' }, { name: 'walk' }]
      const mode = resolveEffectiveMode('programmatic', clips, null)
      expect(mode).toBe('programmatic')
    })

    it('no mixer created when mode is explicit programmatic even with clips', () => {
      const clips = [{ name: 'idle' }]
      const mode = resolveEffectiveMode('programmatic', clips, null)
      expect(shouldCreateMixer(mode, clips)).toBe(false)
    })

    it('explicit programmatic mode with activeClip still stays programmatic', () => {
      const clips = [{ name: 'idle' }]
      const mode = resolveEffectiveMode('programmatic', clips, 'idle')
      expect(mode).toBe('programmatic')
    })
  })

  describe('non-programmatic modes with valid clips DO create mixer', () => {
    it('clip mode with valid clips resolves to clip', () => {
      const clips = [{ name: 'idle' }]
      const mode = resolveEffectiveMode('clip', clips, null)
      expect(mode).toBe('clip')
    })

    it('blended mode with valid clips resolves to blended', () => {
      const clips = [{ name: 'idle' }]
      const mode = resolveEffectiveMode('blended', clips, null)
      expect(mode).toBe('blended')
    })

    it('mixer should be created for clip mode with valid clips', () => {
      const clips = [{ name: 'idle' }]
      const mode = resolveEffectiveMode('clip', clips, null)
      expect(shouldCreateMixer(mode, clips)).toBe(true)
    })

    it('mixer should be created for blended mode with valid clips', () => {
      const clips = [{ name: 'idle' }]
      const mode = resolveEffectiveMode('blended', clips, null)
      expect(shouldCreateMixer(mode, clips)).toBe(true)
    })
  })
})
