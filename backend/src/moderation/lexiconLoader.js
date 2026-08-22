/**
 * Lexicon Loader — Reads, validates, and merges all built-in lexicon JSON files.
 *
 * Lexicon files live in `backend/src/moderation/lexicons/` and follow the naming
 * convention `{language}-{category}.json` (e.g., en-toxic.json, tl-toxic.json).
 *
 * Each file must contain:
 *   { "version": "<semver string>", "terms": ["lowercase", "term", ...] }
 *
 * This module:
 *  - Reads all .json files from the lexicons directory at startup
 *  - Validates each file against the expected schema
 *  - Merges terms into grouped categories: crisis, toxic, safeContext
 *  - Builds a termSourceMap mapping each term → its source filename
 *  - Returns frozen arrays so built-in terms are immutable at runtime
 *  - Never crashes — logs warnings/errors and skips invalid files
 */

import { readdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Path to the lexicons directory */
const LEXICONS_DIR = join(__dirname, 'lexicons')

/**
 * @typedef {Object} MergedLexicon
 * @property {string[]} crisis - All crisis terms (all languages), frozen
 * @property {string[]} toxic - All toxic terms (EN + TL + BCL), frozen
 * @property {string[]} safeContext - Safe-context allow phrases, frozen
 * @property {Map<string, string>} termSourceMap - Maps term → source filename for dry-run
 */

/**
 * Determine the category of a lexicon file based on its filename.
 * Uses the portion after the language prefix:
 *  - "crisis" → crisis
 *  - "toxic" → toxic
 *  - "safe-context" → safeContext
 *
 * @param {string} filename - e.g., "en-toxic.json", "all-crisis.json"
 * @returns {'crisis' | 'toxic' | 'safeContext' | null}
 */
function categorizeFile(filename) {
  const lower = filename.toLowerCase()
  if (lower.includes('crisis')) return 'crisis'
  if (lower.includes('toxic')) return 'toxic'
  if (lower.includes('safe-context')) return 'safeContext'
  return null
}

/**
 * Validate a single lexicon file against the expected schema.
 *
 * A valid lexicon file must be an object with:
 *  - `version`: a non-empty string
 *  - `terms`: an array where every element is a string
 *
 * @param {any} parsed - Parsed JSON content
 * @param {string} filename - For error reporting
 * @returns {{ valid: boolean, terms: string[], errors: string[] }}
 */
export function validateLexiconFile(parsed, filename) {
  const errors = []

  // Must be a non-null object
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    errors.push(`${filename}: file content must be a JSON object`)
    return { valid: false, terms: [], errors }
  }

  // Must have a "version" field that is a non-empty string
  if (typeof parsed.version !== 'string' || parsed.version.trim() === '') {
    errors.push(`${filename}: missing or invalid "version" field (must be a non-empty string)`)
  }

  // Must have a "terms" field that is an array
  if (!Array.isArray(parsed.terms)) {
    errors.push(`${filename}: missing or invalid "terms" field (must be an array)`)
    return { valid: errors.length === 0, terms: [], errors }
  }

  // Every element in terms must be a string
  const validTerms = []
  for (let i = 0; i < parsed.terms.length; i++) {
    if (typeof parsed.terms[i] !== 'string') {
      errors.push(`${filename}: terms[${i}] is not a string (got ${typeof parsed.terms[i]})`)
    } else {
      validTerms.push(parsed.terms[i])
    }
  }

  return {
    valid: errors.length === 0,
    terms: errors.length === 0 ? validTerms : [],
    errors
  }
}

/**
 * Load and validate all lexicon JSON files from the lexicons directory.
 *
 * Reads every .json file, validates its schema, categorizes it by filename,
 * and merges all terms into a single MergedLexicon grouped by category.
 *
 * Behaviour on errors:
 *  - Missing lexicons directory → log warning, return empty lexicon
 *  - File with invalid JSON → log error, skip file
 *  - File with invalid schema → log error, skip file
 *  - Unknown category in filename → log warning, skip file
 *  - Never crashes (all exceptions are caught and logged)
 *
 * @returns {MergedLexicon}
 */
export function loadBuiltInLexicons() {
  /** @type {string[]} */
  const crisis = []
  /** @type {string[]} */
  const toxic = []
  /** @type {string[]} */
  const safeContext = []
  /** @type {Map<string, string>} */
  const termSourceMap = new Map()

  // Attempt to read the lexicons directory
  let files
  try {
    files = readdirSync(LEXICONS_DIR)
  } catch (err) {
    console.warn(`[lexiconLoader] WARNING: Cannot read lexicons directory at ${LEXICONS_DIR}: ${err.message}`)
    return {
      crisis: Object.freeze([]),
      toxic: Object.freeze([]),
      safeContext: Object.freeze([]),
      termSourceMap
    }
  }

  // Filter to only .json files
  const jsonFiles = files.filter(f => f.endsWith('.json'))

  if (jsonFiles.length === 0) {
    console.warn('[lexiconLoader] WARNING: No .json files found in lexicons directory. Engine will operate with empty built-in lists.')
  }

  for (const filename of jsonFiles) {
    const filepath = join(LEXICONS_DIR, filename)

    // Parse JSON
    let parsed
    try {
      const raw = readFileSync(filepath, 'utf-8')
      parsed = JSON.parse(raw)
    } catch (err) {
      console.error(`[lexiconLoader] ERROR: Failed to parse ${filename}: ${err.message}`)
      continue
    }

    // Validate schema
    const validation = validateLexiconFile(parsed, filename)
    if (!validation.valid) {
      for (const errMsg of validation.errors) {
        console.error(`[lexiconLoader] ERROR: ${errMsg}`)
      }
      continue
    }

    // Determine category from filename
    const category = categorizeFile(filename)
    if (category === null) {
      console.warn(`[lexiconLoader] WARNING: Cannot determine category for ${filename} (expected "crisis", "toxic", or "safe-context" in filename). Skipping.`)
      continue
    }

    // Add terms to the appropriate category and track source
    const { terms } = validation
    for (const term of terms) {
      switch (category) {
        case 'crisis':
          crisis.push(term)
          break
        case 'toxic':
          toxic.push(term)
          break
        case 'safeContext':
          safeContext.push(term)
          break
      }
      // Map each term to its source file (first occurrence wins if duplicated across files)
      if (!termSourceMap.has(term)) {
        termSourceMap.set(term, filename)
      }
    }
  }

  console.log(`[lexiconLoader] Loaded built-in lexicons: ${crisis.length} crisis, ${toxic.length} toxic, ${safeContext.length} safe-context terms from ${jsonFiles.length} files`)

  return {
    crisis: Object.freeze(crisis),
    toxic: Object.freeze(toxic),
    safeContext: Object.freeze(safeContext),
    termSourceMap
  }
}
