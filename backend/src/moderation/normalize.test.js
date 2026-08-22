/**
 * Normalize Module Unit Tests — Example-based tests for the 10-step pipeline.
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import { describe, it, expect } from 'vitest'
import {
  normalize,
  removeHomoglyphs,
  removeDotSeparators,
  collapseSpacedChars,
  leetSpeak,
} from './normalize.js'

// ── Input Handling ───────────────────────────────────────────────────────────

describe('normalize — input handling', () => {
  it('returns empty string for null', () => {
    expect(normalize(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(normalize(undefined)).toBe('')
  })

  it('returns empty string for non-string (number)', () => {
    expect(normalize(123)).toBe('')
  })

  it('returns empty string for non-string (object)', () => {
    expect(normalize({})).toBe('')
  })

  it('returns empty string for non-string (array)', () => {
    expect(normalize(['hello'])).toBe('')
  })

  it('returns empty string for empty string input', () => {
    expect(normalize('')).toBe('')
  })
})

// ── Step 1 & 2: NFKD + Combining Marks Removal (Req 5.4) ────────────────────

describe('normalize — NFKD + diacritics removal', () => {
  it('removes accent from precomposed ñ', () => {
    // ñ (U+00F1) → NFKD → n + combining tilde → tilde stripped → 'n'
    expect(normalize('ñ')).toBe('n')
  })

  it('removes accent from é', () => {
    expect(normalize('café')).toBe('cafe')
  })

  it('removes multiple accents', () => {
    expect(normalize('naïve résumé')).toBe('naive resume')
  })

  it('handles already-decomposed text', () => {
    // n + combining tilde (U+0303) → tilde stripped → 'n'
    expect(normalize('n\u0303')).toBe('n')
  })

  it('strips combining marks in U+0300-U+036F range', () => {
    // a + combining grave (U+0300) + combining acute (U+0301)
    expect(normalize('a\u0300\u0301')).toBe('a')
  })
})

// ── Step 3: Homoglyph Replacement (Req 5.3) ─────────────────────────────────

describe('normalize — homoglyph replacement', () => {
  it('replaces Cyrillic а with Latin a', () => {
    // Cyrillic а (U+0430) looks identical to Latin a
    expect(normalize('\u0430bc')).toBe('abc')
  })

  it('replaces Cyrillic е with Latin e', () => {
    expect(normalize('h\u0435llo')).toBe('hello')
  })

  it('replaces Cyrillic о with Latin o', () => {
    expect(normalize('hell\u043E')).toBe('hello')
  })

  it('replaces Cyrillic р with Latin p', () => {
    expect(normalize('\u0440uta')).toBe('puta')
  })

  it('replaces Cyrillic с with Latin c', () => {
    expect(normalize('\u0441at')).toBe('cat')
  })

  it('replaces Cyrillic у with Latin y', () => {
    expect(normalize('\u0443es')).toBe('yes')
  })

  it('replaces Greek α with Latin a', () => {
    expect(normalize('\u03B1pple')).toBe('apple')
  })

  it('replaces Greek ε with Latin e', () => {
    expect(normalize('h\u03B5llo')).toBe('hello')
  })

  it('replaces Greek ο with Latin o', () => {
    expect(normalize('hell\u03BF')).toBe('hello')
  })

  it('replaces fullwidth Latin Ａ with A', () => {
    expect(normalize('\uFF21pple')).toBe('apple')
  })

  it('replaces fullwidth Latin ａ with a', () => {
    expect(normalize('\uFF41pple')).toBe('apple')
  })

  it('replaces fullwidth digits', () => {
    // Note: NFKD (step 1) decomposes fullwidth digits to ASCII digits,
    // then leet-speak (step 5) converts 1→i, 3→e. This is correct pipeline behavior.
    // To test homoglyph replacement of fullwidth digits in isolation:
    expect(removeHomoglyphs('\uFF11\uFF12\uFF13')).toBe('123')
    // Full pipeline: fullwidth digits get leet-speak converted after NFKD
    expect(normalize('\uFF11\uFF12\uFF13')).toBe('i2e')
  })

  it('handles mixed Cyrillic evasion: рutа → puta', () => {
    // р (Cyrillic) + u + t + а (Cyrillic)
    expect(normalize('\u0440ut\u0430')).toBe('puta')
  })
})

describe('removeHomoglyphs — exported function', () => {
  it('replaces Cyrillic characters', () => {
    expect(removeHomoglyphs('\u0430\u0435\u043E')).toBe('aeo')
  })

  it('leaves regular Latin characters unchanged', () => {
    expect(removeHomoglyphs('hello world')).toBe('hello world')
  })

  it('replaces fullwidth uppercase', () => {
    expect(removeHomoglyphs('\uFF28\uFF25\uFF2C\uFF2C\uFF2F')).toBe('HELLO')
  })
})

// ── Step 4: Lowercase ────────────────────────────────────────────────────────

describe('normalize — lowercase conversion', () => {
  it('converts uppercase to lowercase', () => {
    expect(normalize('HELLO WORLD')).toBe('hello world')
  })

  it('handles mixed case', () => {
    expect(normalize('HeLLo WoRLd')).toBe('hello world')
  })
})

// ── Step 5: Leet-speak (Req expanded) ────────────────────────────────────────

describe('normalize — leet-speak substitution', () => {
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

  it('converts combined leet: p0+@', () => {
    expect(normalize('p0+@')).toBe('pota')
  })
})

describe('leetSpeak — exported function', () => {
  it('applies all leet rules', () => {
    // @→a, 3→e, !→i, 0→o, $→s, 7→t
    expect(leetSpeak('@3!0$7')).toBe('aeiost')
  })

  it('leaves normal text unchanged', () => {
    expect(leetSpeak('hello')).toBe('hello')
  })
})

// ── Step 6: Dot-separator Stripping (Req 5.1) ───────────────────────────────

describe('normalize — dot-separator stripping', () => {
  it('joins "p.u.t.a" → "puta"', () => {
    expect(normalize('p.u.t.a')).toBe('puta')
  })

  it('joins "g.a.g.o" → "gago"', () => {
    expect(normalize('g.a.g.o')).toBe('gago')
  })

  it('joins "t.a.n.g.i.n.a" → "tangina"', () => {
    expect(normalize('t.a.n.g.i.n.a')).toBe('tangina')
  })

  it('does NOT strip dots in normal sentences', () => {
    expect(normalize('I went home. She left.')).toBe('i went home. she left.')
  })

  it('does NOT strip dots in abbreviations with multiple chars', () => {
    expect(normalize('Dr. Smith said hello')).toBe('dr. smith said hello')
  })

  it('handles dot-separated at start of text', () => {
    expect(normalize('b.o.b.o ka')).toBe('bobo ka')
  })

  it('handles dot-separated at end of text', () => {
    expect(normalize('you are g.a.g.o')).toBe('you are gago')
  })
})

describe('removeDotSeparators — exported function', () => {
  it('joins single chars separated by dots', () => {
    expect(removeDotSeparators('p.u.t.a')).toBe('puta')
  })

  it('leaves multi-char segments alone', () => {
    expect(removeDotSeparators('hello.world')).toBe('hello.world')
  })
})

// ── Step 7: Space-collapse (Req 5.2) ─────────────────────────────────────────

describe('normalize — space-between-characters collapsing', () => {
  it('collapses "p u t a" → "puta"', () => {
    expect(normalize('p u t a')).toBe('puta')
  })

  it('collapses "t a n g i n a" → "tangina"', () => {
    expect(normalize('t a n g i n a')).toBe('tangina')
  })

  it('collapses "g a g o" → "gago"', () => {
    expect(normalize('g a g o')).toBe('gago')
  })

  it('does NOT collapse normal multi-char words', () => {
    expect(normalize('I am sad today')).toBe('i am sad today')
  })

  it('handles multiple spaces between single chars', () => {
    expect(normalize('p  u  t  a')).toBe('puta')
  })

  it('preserves single-char words like "I" and "a" in context', () => {
    // "I" and "a" are single chars but surrounded by multi-char words
    expect(normalize('I am a cat')).toBe('i am a cat')
  })

  it('collapses up to 10 characters (max)', () => {
    expect(normalize('a b c d e f g h i j')).toBe('abcdefghij')
  })
})

describe('collapseSpacedChars — exported function', () => {
  it('collapses spaced single chars', () => {
    expect(collapseSpacedChars('p u t a')).toBe('puta')
  })

  it('leaves multi-char words alone', () => {
    expect(collapseSpacedChars('hello world')).toBe('hello world')
  })
})

// ── Step 8: Repeated Character Reduction ─────────────────────────────────────

describe('normalize — repeated character reduction', () => {
  it('reduces 3+ consecutive chars to 2', () => {
    expect(normalize('puuuuta')).toBe('puuta')
  })

  it('reduces long repetitions', () => {
    expect(normalize('heeeeello')).toBe('heello')
  })

  it('preserves exactly 2 consecutive chars', () => {
    expect(normalize('hello')).toBe('hello')
  })

  it('reduces multiple groups', () => {
    expect(normalize('aaabbbccc')).toBe('aabbcc')
  })
})

// ── Step 9: Zero-width Character Removal ─────────────────────────────────────

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

  it('removes soft hyphen (U+00AD)', () => {
    expect(normalize('su\u00ADicide')).toBe('suicide')
  })

  it('removes multiple zero-width characters', () => {
    expect(normalize('s\u200Bu\u200Ci\u200Dc\uFEFFide')).toBe('suicide')
  })
})

// ── Step 10: Whitespace Normalization ────────────────────────────────────────

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

// ── Non-BMP Characters (Req 5.7) ─────────────────────────────────────────────

describe('normalize — non-BMP character handling', () => {
  it('passes through emoji unchanged', () => {
    const result = normalize('hello 🫂 world')
    expect(result).toBe('hello 🫂 world')
  })

  it('passes through supplementary characters', () => {
    // U+1F600 (😀) is above U+FFFF
    const result = normalize('test 😀 message')
    expect(result).toBe('test 😀 message')
  })

  it('handles text with multiple emoji', () => {
    const result = normalize('I feel 💙😢🌱✨ today')
    expect(result).toBe('i feel 💙😢🌱✨ today')
  })

  it('does not truncate text after non-BMP characters', () => {
    const result = normalize('before 🎉 after')
    expect(result).toBe('before 🎉 after')
  })
})

// ── Combined Evasions ────────────────────────────────────────────────────────

describe('normalize — combined evasion patterns', () => {
  it('handles leet-speak + repetition', () => {
    expect(normalize('$uuu1c1d3')).toBe('suuicide')
  })

  it('handles leet-speak + zero-width characters', () => {
    expect(normalize('$u\u200B1c\u200D1d3')).toBe('suicide')
  })

  it('handles Cyrillic + dot-separation: р.u.t.а', () => {
    expect(normalize('\u0440.u.t.\u0430')).toBe('puta')
  })

  it('handles fullwidth + spacing: ｐ ｕ ｔ ａ', () => {
    expect(normalize('\uFF50 \uFF55 \uFF54 \uFF41')).toBe('puta')
  })

  it('handles all evasions together', () => {
    expect(normalize('  $uuu\u200B1c\u200D1d333  ')).toBe('suuicidee')
  })

  it('handles homoglyph + leet: рut@ng1n@', () => {
    expect(normalize('\u0440ut@ng1n@')).toBe('putangina')
  })

  it('handles diacritics + leet: pút@', () => {
    expect(normalize('p\u00FA+@')).toBe('puta')
  })
})

// ── Performance (Req 5.6) ────────────────────────────────────────────────────

describe('normalize — performance', () => {
  it('completes within 5ms for 280-char input', () => {
    const input = 'a'.repeat(280)
    const start = performance.now()
    normalize(input)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(5)
  })

  it('completes within 5ms for complex evasion 280-char input', () => {
    // Mix of evasion patterns
    const input = '$u\u200B1c\u200D1d3 '.repeat(35).slice(0, 280)
    const start = performance.now()
    normalize(input)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(5)
  })
})
