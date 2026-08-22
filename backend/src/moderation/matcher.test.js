/**
 * Unit tests for the Aho-Corasick matcher module.
 *
 * Tests buildAutomaton(), searchAll(), and hasWordBoundary() exports.
 * Validates: Requirements 8.2, 8.3, 8.4, 9.4
 */
import { describe, it, expect } from 'vitest';
import { buildAutomaton, searchAll, hasWordBoundary } from './matcher.js';

describe('matcher module', () => {
  describe('buildAutomaton', () => {
    it('returns null for empty array', () => {
      expect(buildAutomaton([])).toBe(null);
    });

    it('returns null for null/undefined input', () => {
      expect(buildAutomaton(null)).toBe(null);
      expect(buildAutomaton(undefined)).toBe(null);
    });

    it('returns null for array of only empty strings', () => {
      expect(buildAutomaton(['', '', ''])).toBe(null);
    });

    it('builds a valid automaton from terms', () => {
      const automaton = buildAutomaton(['hello', 'world']);
      expect(automaton).not.toBe(null);
      expect(automaton.search).toBeTypeOf('function');
    });

    it('deduplicates terms', () => {
      const automaton = buildAutomaton(['puta', 'gago', 'puta', 'gago']);
      const results = searchAll(automaton, 'puta gago');
      // Each term should appear exactly once
      const putaMatches = results.filter(r => r.term === 'puta');
      const gagoMatches = results.filter(r => r.term === 'gago');
      expect(putaMatches).toHaveLength(1);
      expect(gagoMatches).toHaveLength(1);
    });

    it('filters out empty strings from terms', () => {
      const automaton = buildAutomaton(['', 'hello', '']);
      expect(automaton).not.toBe(null);
      const results = searchAll(automaton, 'hello');
      expect(results).toHaveLength(1);
      expect(results[0].term).toBe('hello');
    });
  });

  describe('searchAll', () => {
    it('returns empty array for empty text', () => {
      const automaton = buildAutomaton(['hello']);
      expect(searchAll(automaton, '')).toEqual([]);
    });

    it('returns empty array for null text', () => {
      const automaton = buildAutomaton(['hello']);
      expect(searchAll(automaton, null)).toEqual([]);
    });

    it('returns empty array for null automaton', () => {
      expect(searchAll(null, 'hello world')).toEqual([]);
    });

    it('returns empty array when no matches found', () => {
      const automaton = buildAutomaton(['xyz']);
      expect(searchAll(automaton, 'hello world')).toEqual([]);
    });

    it('finds a single match with correct positions', () => {
      const automaton = buildAutomaton(['puta']);
      const results = searchAll(automaton, 'ikaw puta ka');
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        term: 'puta',
        start: 5,
        end: 9,
        source: 'built-in'
      });
    });

    it('finds multiple different matches', () => {
      const automaton = buildAutomaton(['puta', 'gago']);
      const results = searchAll(automaton, 'puta ka gago');
      expect(results).toHaveLength(2);

      const puta = results.find(r => r.term === 'puta');
      const gago = results.find(r => r.term === 'gago');
      expect(puta).toEqual({ term: 'puta', start: 0, end: 4, source: 'built-in' });
      expect(gago).toEqual({ term: 'gago', start: 8, end: 12, source: 'built-in' });
    });

    it('finds overlapping matches', () => {
      const automaton = buildAutomaton(['ass', 'assassin']);
      const results = searchAll(automaton, 'assassin');
      // Should find both "ass" (at various positions due to overlaps) and "assassin"
      const assMatches = results.filter(r => r.term === 'ass');
      const assassinMatches = results.filter(r => r.term === 'assassin');
      expect(assMatches.length).toBeGreaterThanOrEqual(1);
      expect(assassinMatches).toHaveLength(1);
    });

    it('finds repeated occurrences of the same term', () => {
      const automaton = buildAutomaton(['ha']);
      const results = searchAll(automaton, 'hahaha');
      expect(results.length).toBe(3);
    });

    it('uses custom source label', () => {
      const automaton = buildAutomaton(['test']);
      const results = searchAll(automaton, 'test', 'admin');
      expect(results[0].source).toBe('admin');
    });

    it('defaults source to built-in', () => {
      const automaton = buildAutomaton(['test']);
      const results = searchAll(automaton, 'test');
      expect(results[0].source).toBe('built-in');
    });

    it('finds multi-word phrase matches', () => {
      const automaton = buildAutomaton(['tangina mo']);
      const results = searchAll(automaton, 'hey tangina mo naman');
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        term: 'tangina mo',
        start: 4,
        end: 14,
        source: 'built-in'
      });
    });

    it('finds match at start of text', () => {
      const automaton = buildAutomaton(['hello']);
      const results = searchAll(automaton, 'hello world');
      expect(results[0].start).toBe(0);
      expect(results[0].end).toBe(5);
    });

    it('finds match at end of text', () => {
      const automaton = buildAutomaton(['world']);
      const results = searchAll(automaton, 'hello world');
      expect(results[0].start).toBe(6);
      expect(results[0].end).toBe(11);
    });
  });

  describe('hasWordBoundary', () => {
    it('returns true for multi-word terms (skips boundary check)', () => {
      const match = { term: 'tangina mo', start: 0, end: 10, source: 'built-in' };
      // Even if surrounded by non-boundary characters, multi-word terms pass
      expect(hasWordBoundary('xtangina mox', match)).toBe(true);
    });

    it('returns true when match is the entire text', () => {
      const match = { term: 'puta', start: 0, end: 4, source: 'built-in' };
      expect(hasWordBoundary('puta', match)).toBe(true);
    });

    it('returns true when match is at start with space after', () => {
      const match = { term: 'puta', start: 0, end: 4, source: 'built-in' };
      expect(hasWordBoundary('puta ka', match)).toBe(true);
    });

    it('returns true when match is at end with space before', () => {
      const match = { term: 'puta', start: 5, end: 9, source: 'built-in' };
      expect(hasWordBoundary('ikaw puta', match)).toBe(true);
    });

    it('returns true when match is surrounded by spaces', () => {
      const match = { term: 'puta', start: 5, end: 9, source: 'built-in' };
      expect(hasWordBoundary('ikaw puta naman', match)).toBe(true);
    });

    it('returns true when match is surrounded by punctuation', () => {
      const match = { term: 'puta', start: 1, end: 5, source: 'built-in' };
      expect(hasWordBoundary('!puta!', match)).toBe(true);
    });

    it('returns false when match is a substring (no left boundary)', () => {
      // "ass" inside "class"
      const match = { term: 'ass', start: 2, end: 5, source: 'built-in' };
      expect(hasWordBoundary('class', match)).toBe(false);
    });

    it('returns false when match is a substring (no right boundary)', () => {
      // "ass" inside "assassin"
      const match = { term: 'ass', start: 0, end: 3, source: 'built-in' };
      expect(hasWordBoundary('assassin', match)).toBe(false);
    });

    it('returns false when match has no boundaries on either side', () => {
      // "ass" inside "grass" (start=2, end=5 → "gr[ass]" but text is "grassy")
      const match = { term: 'ass', start: 2, end: 5, source: 'built-in' };
      expect(hasWordBoundary('grassy', match)).toBe(false);
    });

    it('prevents "ass" from matching inside "class"', () => {
      const automaton = buildAutomaton(['ass']);
      const results = searchAll(automaton, 'class');
      // There will be a raw match, but boundary check should reject it
      const validMatches = results.filter(m => hasWordBoundary('class', m));
      expect(validMatches).toHaveLength(0);
    });

    it('prevents "ass" from matching inside "assassin"', () => {
      const automaton = buildAutomaton(['ass']);
      const results = searchAll(automaton, 'assassin');
      const validMatches = results.filter(m => hasWordBoundary('assassin', m));
      expect(validMatches).toHaveLength(0);
    });

    it('prevents "ass" from matching inside "grass"', () => {
      const automaton = buildAutomaton(['ass']);
      const results = searchAll(automaton, 'grass');
      const validMatches = results.filter(m => hasWordBoundary('grass', m));
      expect(validMatches).toHaveLength(0);
    });

    it('prevents "rape" from matching inside "grape"', () => {
      const automaton = buildAutomaton(['rape']);
      const results = searchAll(automaton, 'grape');
      const validMatches = results.filter(m => hasWordBoundary('grape', m));
      expect(validMatches).toHaveLength(0);
    });

    it('allows "ass" when it is a standalone word', () => {
      const automaton = buildAutomaton(['ass']);
      const results = searchAll(automaton, 'what an ass');
      const validMatches = results.filter(m => hasWordBoundary('what an ass', m));
      expect(validMatches).toHaveLength(1);
      expect(validMatches[0].term).toBe('ass');
    });

    it('treats comma as a punctuation boundary', () => {
      const match = { term: 'puta', start: 0, end: 4, source: 'built-in' };
      expect(hasWordBoundary('puta,ganon', match)).toBe(true);
    });

    it('treats period as a punctuation boundary', () => {
      const match = { term: 'gago', start: 0, end: 4, source: 'built-in' };
      expect(hasWordBoundary('gago.', match)).toBe(true);
    });

    it('treats exclamation mark as a punctuation boundary', () => {
      const match = { term: 'bobo', start: 0, end: 4, source: 'built-in' };
      expect(hasWordBoundary('bobo!', match)).toBe(true);
    });
  });

  describe('integration: searchAll + hasWordBoundary', () => {
    it('correctly filters partial matches from a real sentence', () => {
      const automaton = buildAutomaton(['ass', 'shit', 'puta']);
      const text = 'the class was shitty but puta';
      const allMatches = searchAll(automaton, text);
      const validMatches = allMatches.filter(m => hasWordBoundary(text, m));

      // "ass" inside "class" should be filtered out
      // "shit" inside "shitty" should be filtered out (no right boundary)
      // "puta" at end of string should pass
      const terms = validMatches.map(m => m.term);
      expect(terms).not.toContain('ass');
      expect(terms).toContain('puta');
    });

    it('multi-word terms always pass boundary validation', () => {
      const automaton = buildAutomaton(['tangina mo', 'gago ka']);
      const text = 'xtangina mox xgago kax';
      const allMatches = searchAll(automaton, text);
      const validMatches = allMatches.filter(m => hasWordBoundary(text, m));

      // Multi-word terms skip boundary validation
      expect(validMatches).toHaveLength(2);
    });
  });
});
