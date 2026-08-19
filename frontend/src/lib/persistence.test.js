/**
 * Unit tests for the persistence module.
 * Covers storageKey, validatePersistedState, saveState, loadState, clearState.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  storageKey,
  validatePersistedState,
  saveState,
  loadState,
  clearState,
  VALID_PHASES,
  DEFAULT_AVATAR,
} from './persistence.js'

describe('persistence module', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('storageKey', () => {
    it('returns namespaced key with userId', () => {
      expect(storageKey('abc-123')).toBe('anonemote_user_abc-123')
    })

    it('handles UUID format', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      expect(storageKey(uuid)).toBe(`anonemote_user_${uuid}`)
    })
  })

  describe('VALID_PHASES', () => {
    it('contains all five phases', () => {
      expect(VALID_PHASES).toEqual(['landing', 'auth', 'avatar', 'checkin', 'space'])
    })
  })

  describe('DEFAULT_AVATAR', () => {
    it('has the correct default values', () => {
      expect(DEFAULT_AVATAR).toEqual({
        shape: 'spirit',
        auraColor: '#C4B5FD',
        particles: 'stardust',
        scale: 1,
      })
    })
  })

  describe('validatePersistedState', () => {
    const validState = {
      version: '1',
      phase: 'space',
      avatar: { shape: 'spirit', auraColor: '#C4B5FD', particles: 'stardust', scale: 1 },
      checkIn: { feeling: 'joy', nuance: 'grateful', prompt: 'What sparked that?' },
    }

    it('accepts a fully valid state', () => {
      const result = validatePersistedState(validState)
      expect(result.valid).toBe(true)
      expect(result.state).toEqual(validState)
    })

    it('rejects null', () => {
      expect(validatePersistedState(null)).toEqual({ valid: false, state: null })
    })

    it('rejects non-object', () => {
      expect(validatePersistedState('string')).toEqual({ valid: false, state: null })
      expect(validatePersistedState(42)).toEqual({ valid: false, state: null })
    })

    it('rejects wrong version', () => {
      const bad = { ...validState, version: '2' }
      expect(validatePersistedState(bad)).toEqual({ valid: false, state: null })
    })

    it('rejects invalid phase', () => {
      const bad = { ...validState, phase: 'invalid' }
      expect(validatePersistedState(bad)).toEqual({ valid: false, state: null })
    })

    it('replaces invalid avatar with DEFAULT_AVATAR', () => {
      const bad = {
        ...validState,
        avatar: { shape: 'invalid_shape', auraColor: '#C4B5FD', particles: 'stardust', scale: 1 },
      }
      const result = validatePersistedState(bad)
      expect(result.valid).toBe(true)
      expect(result.state.avatar).toEqual(DEFAULT_AVATAR)
    })

    it('replaces avatar with bad auraColor', () => {
      const bad = {
        ...validState,
        avatar: { shape: 'spirit', auraColor: 'not-hex', particles: 'stardust', scale: 1 },
      }
      const result = validatePersistedState(bad)
      expect(result.valid).toBe(true)
      expect(result.state.avatar).toEqual(DEFAULT_AVATAR)
    })

    it('replaces avatar with bad particles', () => {
      const bad = {
        ...validState,
        avatar: { shape: 'spirit', auraColor: '#C4B5FD', particles: 'invalid', scale: 1 },
      }
      const result = validatePersistedState(bad)
      expect(result.valid).toBe(true)
      expect(result.state.avatar).toEqual(DEFAULT_AVATAR)
    })

    it('replaces avatar with scale out of range (too low)', () => {
      const bad = {
        ...validState,
        avatar: { shape: 'spirit', auraColor: '#C4B5FD', particles: 'stardust', scale: 0.4 },
      }
      const result = validatePersistedState(bad)
      expect(result.valid).toBe(true)
      expect(result.state.avatar).toEqual(DEFAULT_AVATAR)
    })

    it('replaces avatar with scale out of range (too high)', () => {
      const bad = {
        ...validState,
        avatar: { shape: 'spirit', auraColor: '#C4B5FD', particles: 'stardust', scale: 2.1 },
      }
      const result = validatePersistedState(bad)
      expect(result.valid).toBe(true)
      expect(result.state.avatar).toEqual(DEFAULT_AVATAR)
    })

    it('replaces avatar with NaN scale', () => {
      const bad = {
        ...validState,
        avatar: { shape: 'spirit', auraColor: '#C4B5FD', particles: 'stardust', scale: NaN },
      }
      const result = validatePersistedState(bad)
      expect(result.valid).toBe(true)
      expect(result.state.avatar).toEqual(DEFAULT_AVATAR)
    })

    it('accepts checkIn with all null fields', () => {
      const state = { ...validState, checkIn: { feeling: null, nuance: null, prompt: null } }
      const result = validatePersistedState(state)
      expect(result.valid).toBe(true)
      expect(result.state.checkIn).toEqual({ feeling: null, nuance: null, prompt: null })
    })

    it('rejects checkIn with numeric feeling', () => {
      const bad = { ...validState, checkIn: { feeling: 42, nuance: null, prompt: null } }
      expect(validatePersistedState(bad)).toEqual({ valid: false, state: null })
    })

    it('accepts boundary scale values (0.5 and 2.0)', () => {
      const atMin = {
        ...validState,
        avatar: { shape: 'spirit', auraColor: '#C4B5FD', particles: 'stardust', scale: 0.5 },
      }
      const atMax = {
        ...validState,
        avatar: { shape: 'spirit', auraColor: '#C4B5FD', particles: 'stardust', scale: 2.0 },
      }
      expect(validatePersistedState(atMin).valid).toBe(true)
      expect(validatePersistedState(atMin).state.avatar.scale).toBe(0.5)
      expect(validatePersistedState(atMax).valid).toBe(true)
      expect(validatePersistedState(atMax).state.avatar.scale).toBe(2.0)
    })
  })

  describe('saveState', () => {
    it('writes valid state to localStorage and returns true', () => {
      const state = {
        version: '1',
        phase: 'avatar',
        avatar: DEFAULT_AVATAR,
        checkIn: { feeling: null, nuance: null, prompt: null },
      }
      const result = saveState('user-1', state)
      expect(result).toBe(true)
      expect(localStorage.getItem('anonemote_user_user-1')).toBe(JSON.stringify(state))
    })

    it('returns false when localStorage throws', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota exceeded')
      })
      const state = {
        version: '1',
        phase: 'space',
        avatar: DEFAULT_AVATAR,
        checkIn: { feeling: null, nuance: null, prompt: null },
      }
      const result = saveState('user-1', state)
      expect(result).toBe(false)
      spy.mockRestore()
    })
  })

  describe('loadState', () => {
    it('returns null when no data exists', () => {
      expect(loadState('nonexistent')).toBeNull()
    })

    it('returns validated state for valid stored data', () => {
      const state = {
        version: '1',
        phase: 'checkin',
        avatar: { shape: 'moon', auraColor: '#FFFFFF', particles: 'rings', scale: 1.5 },
        checkIn: { feeling: 'joy', nuance: null, prompt: null },
      }
      localStorage.setItem('anonemote_user_user-2', JSON.stringify(state))
      expect(loadState('user-2')).toEqual(state)
    })

    it('returns null and removes key for invalid JSON', () => {
      localStorage.setItem('anonemote_user_user-3', 'not json{{{')
      const result = loadState('user-3')
      expect(result).toBeNull()
      expect(localStorage.getItem('anonemote_user_user-3')).toBeNull()
    })

    it('returns null and removes key for invalid schema', () => {
      localStorage.setItem('anonemote_user_user-4', JSON.stringify({ bad: 'data' }))
      const result = loadState('user-4')
      expect(result).toBeNull()
      expect(localStorage.getItem('anonemote_user_user-4')).toBeNull()
    })

    it('returns state with DEFAULT_AVATAR when avatar is invalid', () => {
      const stored = {
        version: '1',
        phase: 'space',
        avatar: { shape: 'INVALID', auraColor: '#C4B5FD', particles: 'stardust', scale: 1 },
        checkIn: { feeling: null, nuance: null, prompt: null },
      }
      localStorage.setItem('anonemote_user_user-5', JSON.stringify(stored))
      const result = loadState('user-5')
      expect(result.avatar).toEqual(DEFAULT_AVATAR)
      expect(result.phase).toBe('space')
    })

    it('returns null when localStorage throws on getItem', () => {
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked')
      })
      expect(loadState('user-6')).toBeNull()
      spy.mockRestore()
    })
  })

  describe('clearState', () => {
    it('removes the key for the given userId', () => {
      localStorage.setItem('anonemote_user_user-7', '{}')
      clearState('user-7')
      expect(localStorage.getItem('anonemote_user_user-7')).toBeNull()
    })

    it('does not throw when localStorage is unavailable', () => {
      const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('blocked')
      })
      expect(() => clearState('user-8')).not.toThrow()
      spy.mockRestore()
    })
  })
})
