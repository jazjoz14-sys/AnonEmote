/**
 * Property-based tests for TermsModal section ordering
 *
 * @vitest-environment jsdom
 */

// Feature: onboarding-terms-qol, Property 1: Terms sections render in source-data order
// Validates: Requirements 2.1

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { render, cleanup } from '@testing-library/react'
import { createElement } from 'react'
import TermsModal from './TermsModal.jsx'
import { termsAndConditions, privacyPolicy } from '../../data/terms.js'

describe('TermsModal - Property 1: Terms sections render in source-data order', () => {
  it('rendered headings for type=terms appear in the same order as termsAndConditions array indices', () => {
    fc.assert(
      fc.property(
        fc.constant(termsAndConditions),
        (sections) => {
          cleanup()
          const { container } = render(
            createElement(TermsModal, { type: 'terms', onClose: () => {} })
          )

          const headings = container.querySelectorAll('h3')
          const renderedTexts = Array.from(headings).map((h) => h.textContent)

          expect(renderedTexts.length).toBe(sections.length)

          sections.forEach((section, i) => {
            expect(renderedTexts[i]).toBe(section.heading)
          })
        }
      ),
      { numRuns: 100 }
    )
    cleanup()
  })

  it('rendered headings for type=privacy appear in the same order as privacyPolicy array indices', () => {
    fc.assert(
      fc.property(
        fc.constant(privacyPolicy),
        (sections) => {
          cleanup()
          const { container } = render(
            createElement(TermsModal, { type: 'privacy', onClose: () => {} })
          )

          const headings = container.querySelectorAll('h3')
          const renderedTexts = Array.from(headings).map((h) => h.textContent)

          expect(renderedTexts.length).toBe(sections.length)

          sections.forEach((section, i) => {
            expect(renderedTexts[i]).toBe(section.heading)
          })
        }
      ),
      { numRuns: 100 }
    )
    cleanup()
  })

  it('for any type prop, the render always preserves source-data order', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('terms', 'privacy'),
        (type) => {
          cleanup()
          const sourceData = type === 'privacy' ? privacyPolicy : termsAndConditions

          const { container } = render(
            createElement(TermsModal, { type, onClose: () => {} })
          )

          const headings = container.querySelectorAll('h3')
          const renderedTexts = Array.from(headings).map((h) => h.textContent)

          const expectedHeadings = sourceData.map((s) => s.heading)
          expect(renderedTexts.length).toBe(expectedHeadings.length)
          expectedHeadings.forEach((heading, i) => {
            expect(renderedTexts[i]).toBe(heading)
          })
        }
      ),
      { numRuns: 100 }
    )
    cleanup()
  })
})
