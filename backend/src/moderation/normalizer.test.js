/**
 * Normalizer Unit Tests — Example-based tests for the normalize() function.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 */

import { normalize } from './engine.js'

describe('normalize — leet-speak conversions', () => {
  it('converts @ to a', () => {
    expect(normalize('@pple')).toBe('apple')
  })

  it('converts 4 to a', () => {
    expect(normalize('4pple')).toBe('apple')
  })

  it('converts 3 to e', () => {
    expect(normalize('h3llo')).toBe('hello')
  })

  it('converts 1 to i', () => {
    expect(normalize('k1ll')).toBe('kill')
  })

  it('converts ! to i', () => {
    expect(normalize('k!ll')).toBe('kill')
  })

  it('converts | to i', () => {
    expect(normalize('k|ll')).toBe('kill')
  })

  it('converts 0 to o', () => {
    expect(normalize('hell0')).toBe('hello')
  })

  it('converts $ to s', () => {
    expect(normalize('$uper')).toBe('super')
  })

  it('converts 5 to s', () => {
    expect(normalize('5uper')).toBe('super')
  })

  it('converts 7 to t', () => {
    expect(normalize('7est')).toBe('test')
  })

  it('converts + to t', () => {
    expect(normalize('+est')).toBe('test')
  })
})

describe('normalize — repetition reduction', () => {
  it('reduces 3+ consecutive chars to max 2', () => {
    expect(normalize('suuuicide')).toBe('suuicide')
  })

  it('reduces long repetitions to exactly 2', () => {
    expect(normalize('heeeeello')).toBe('heello')
  })

  it('preserves 2 consecutive chars as-is', () => {
    expect(normalize('hello')).toBe('hello')
  })

  it('reduces multiple groups of repetitions', () => {
    expect(normalize('aaabbbccc')).toBe('aabbcc')
  })
})

describe('normalize — zero-width character removal', () => {
  it('removes zero-width space (U+200B)', () => {
    expect(normalize('su\u200Bicide')).toBe('suicide')
  })

  it('removes zero-width non-joiner (U+200C)', () => {
    expect(normalize('su\u200Cicide')).toBe('suicide')
  })

  it('removes zero-width joiner (U+200D)', () => {
    expect(normalize('su\u200Dicide')).toBe('suicide')
  })

  it('removes byte order mark (U+FEFF)', () => {
    expect(normalize('su\uFEFFicide')).toBe('suicide')
  })

  it('removes multiple zero-width characters', () => {
    expect(normalize('s\u200Bu\u200Ci\u200Dc\uFEFFide')).toBe('suicide')
  })
})

describe('normalize — whitespace normalization', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalize('  hello   world  ')).toBe('hello world')
  })

  it('collapses multiple internal spaces to one', () => {
    expect(normalize('hello     world')).toBe('hello world')
  })

  it('handles tabs and mixed whitespace', () => {
    expect(normalize('\t hello \t world \t')).toBe('hello world')
  })
})

describe('normalize — combined evasions', () => {
  it('handles leet-speak + repetition', () => {
    expect(normalize('$uuu1c1d3')).toBe('suuicide')
  })

  it('handles leet-speak + zero-width characters', () => {
    expect(normalize('$u\u200B1c\u200D1d3')).toBe('suicide')
  })

  it('handles repetition + zero-width characters', () => {
    expect(normalize('suuu\u200Bicide')).toBe('suuicide')
  })

  it('handles all evasions together', () => {
    expect(normalize('  $uuu\u200B1c\u200D1d333  ')).toBe('suuicidee')
  })

  it('lowercases all text', () => {
    expect(normalize('HELLO World')).toBe('hello world')
  })
})
