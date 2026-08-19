/**
 * Unit tests for shared test helpers module.
 * Validates mock factories and PBT text evasion utilities.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  createMockSupabase,
  createMockReq,
  createMockRes,
  applyLeetSpeak,
  injectZeroWidth,
  injectRepetitions,
} from './helpers.js'

describe('createMockSupabase', () => {
  it('returns an object with from() and auth methods', () => {
    const supabase = createMockSupabase()
    expect(supabase.from).toBeDefined()
    expect(supabase.auth).toBeDefined()
    expect(supabase.auth.getUser).toBeDefined()
  })

  it('from().select() chain resolves to configured selectResult', async () => {
    const supabase = createMockSupabase({
      selectResult: { data: [{ id: 1, text: 'hello' }], error: null },
    })
    const result = await supabase.from('posts').select('*')
    expect(result.data).toEqual([{ id: 1, text: 'hello' }])
    expect(result.error).toBeNull()
  })

  it('from().insert() chain resolves to configured insertResult', async () => {
    const supabase = createMockSupabase({
      insertResult: { data: { id: 'abc' }, error: null },
    })
    const result = await supabase.from('posts').insert({ text: 'test' })
    expect(result.data).toEqual({ id: 'abc' })
  })

  it('from().upsert() chain resolves to configured upsertResult', async () => {
    const supabase = createMockSupabase({
      upsertResult: { data: { id: 'xyz' }, error: null },
    })
    const result = await supabase.from('reactions').upsert({ emoji: '💙' })
    expect(result.data).toEqual({ id: 'xyz' })
  })

  it('from().delete() chain resolves to configured deleteResult', async () => {
    const supabase = createMockSupabase({
      deleteResult: { data: null, error: null },
    })
    const chain = supabase.from('posts').delete()
    const result = await chain.eq('id', '123')
    expect(result.error).toBeNull()
  })

  it('from().update() chain resolves to configured updateResult', async () => {
    const supabase = createMockSupabase({
      updateResult: { data: { updated: true }, error: null },
    })
    const chain = supabase.from('posts').update({ text: 'updated' })
    const result = await chain.eq('id', '123')
    expect(result.data).toEqual({ updated: true })
  })

  it('auth.getUser defaults to invalid token response', async () => {
    const supabase = createMockSupabase()
    const result = await supabase.auth.getUser('bad-token')
    expect(result.data.user).toBeNull()
    expect(result.error).toBeDefined()
  })

  it('auth.getUser can be overridden', async () => {
    const supabase = createMockSupabase({
      authGetUser: vi.fn(() =>
        Promise.resolve({ data: { user: { id: 'user-123' } }, error: null })
      ),
    })
    const result = await supabase.auth.getUser('valid-token')
    expect(result.data.user.id).toBe('user-123')
  })
})

describe('createMockReq', () => {
  it('returns defaults when no options provided', () => {
    const req = createMockReq()
    expect(req.body).toEqual({})
    expect(req.headers).toEqual({})
    expect(req.query).toEqual({})
    expect(req.params).toEqual({})
    expect(req.ip).toBe('127.0.0.1')
    expect(req.method).toBe('GET')
    expect(req.socket.remoteAddress).toBe('127.0.0.1')
    expect(req.isAuthenticated).toBe(false)
    expect(req.userId).toBeNull()
  })

  it('accepts custom body, headers, query, ip', () => {
    const req = createMockReq({
      body: { text: 'hello' },
      headers: { authorization: 'Bearer abc' },
      query: { page: '1' },
      ip: '192.168.1.1',
    })
    expect(req.body.text).toBe('hello')
    expect(req.headers.authorization).toBe('Bearer abc')
    expect(req.query.page).toBe('1')
    expect(req.ip).toBe('192.168.1.1')
    expect(req.socket.remoteAddress).toBe('192.168.1.1')
  })

  it('get() returns header values case-insensitively', () => {
    const req = createMockReq({
      headers: { 'content-type': 'application/json' },
    })
    expect(req.get('Content-Type')).toBe('application/json')
  })
})

describe('createMockRes', () => {
  it('status() is chainable and sets statusCode', () => {
    const res = createMockRes()
    const returned = res.status(400)
    expect(returned).toBe(res)
    expect(res.statusCode).toBe(400)
  })

  it('json() stores the response data', () => {
    const res = createMockRes()
    res.status(200).json({ ok: true })
    expect(res._json).toEqual({ ok: true })
    expect(res.statusCode).toBe(200)
  })

  it('end() is callable and chainable', () => {
    const res = createMockRes()
    const returned = res.end()
    expect(returned).toBe(res)
  })

  it('set()/header()/setHeader() store headers', () => {
    const res = createMockRes()
    res.set('X-Custom', 'value1')
    res.header('X-Other', 'value2')
    res.setHeader('X-Third', 'value3')
    expect(res._headers['X-Custom']).toBe('value1')
    expect(res._headers['X-Other']).toBe('value2')
    expect(res._headers['X-Third']).toBe('value3')
  })

  it('set() accepts an object of headers', () => {
    const res = createMockRes()
    res.set({ 'X-A': '1', 'X-B': '2' })
    expect(res._headers['X-A']).toBe('1')
    expect(res._headers['X-B']).toBe('2')
  })

  it('all methods are vi.fn() spies', () => {
    const res = createMockRes()
    res.status(200).json({})
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({})
  })
})

describe('applyLeetSpeak', () => {
  it('returns a string of the same or similar length', () => {
    const input = 'suicide'
    const result = applyLeetSpeak(input)
    expect(typeof result).toBe('string')
    expect(result.length).toBe(input.length)
  })

  it('only substitutes known leet characters (a,e,i,o,s,t)', () => {
    // With enough runs, at least some substitutions should appear
    const input = 'aeiost'
    const leetChars = new Set(['@', '4', '3', '1', '!', '|', '0', '$', '5', '7', '+'])
    let foundLeet = false
    for (let i = 0; i < 50; i++) {
      const result = applyLeetSpeak(input)
      for (const ch of result) {
        if (leetChars.has(ch)) {
          foundLeet = true
          break
        }
      }
      if (foundLeet) break
    }
    expect(foundLeet).toBe(true)
  })

  it('does not modify characters without leet mappings', () => {
    const input = 'xyz'
    // Characters x, y, z have no leet mapping — should always stay the same
    for (let i = 0; i < 20; i++) {
      expect(applyLeetSpeak(input)).toBe('xyz')
    }
  })
})

describe('injectZeroWidth', () => {
  it('returns empty string for empty input', () => {
    expect(injectZeroWidth('')).toBe('')
  })

  it('injects at least one zero-width character', () => {
    const zwChars = ['\u200B', '\u200C', '\u200D', '\uFEFF']
    const input = 'hello'
    const result = injectZeroWidth(input)
    const hasZW = zwChars.some((ch) => result.includes(ch))
    expect(hasZW).toBe(true)
  })

  it('output is longer than or equal to input', () => {
    const input = 'test'
    const result = injectZeroWidth(input)
    expect(result.length).toBeGreaterThan(input.length)
  })
})

describe('injectRepetitions', () => {
  it('returns empty string for empty input', () => {
    expect(injectRepetitions('')).toBe('')
  })

  it('returns input unchanged when no alphabetic characters present', () => {
    expect(injectRepetitions('123')).toBe('123')
  })

  it('creates at least one run of 3 identical characters', () => {
    const input = 'hello'
    let found = false
    for (let i = 0; i < 30; i++) {
      const result = injectRepetitions(input)
      if (/(.)\1\1/.test(result)) {
        found = true
        break
      }
    }
    expect(found).toBe(true)
  })

  it('output is longer than input when alphabetic chars exist', () => {
    const input = 'abc'
    const result = injectRepetitions(input)
    expect(result.length).toBeGreaterThan(input.length)
  })
})
