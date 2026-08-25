/**
 * Landing page copy — warm, human language for Filipino college students.
 *
 * This module centralizes all user-facing text on the landing page so that
 * LandingScreen.jsx stays focused on layout logic and non-engineers can
 * edit copy without touching component code.
 *
 * Character limits are enforced per the requirements document:
 *   - Hero eyebrow: ≤60 chars
 *   - Hero subtitle: ≤120 chars
 *   - Statement eyebrow: ≤50 chars
 *   - Statement headline: ≤140 chars
 *   - Statement subtitle: ≤180 chars
 *   - CTA eyebrow: ≤50 chars
 *   - CTA headline: ≤60 chars
 *   - CTA button label: ≤25 chars
 *   - Planet tagline: 40–120 chars (must use second-person pronouns)
 *   - Planet purpose: ≤160 chars
 *
 * Banned terms (hero/statement): "Zero Knowledge Architecture", "random number",
 * "random UUID", "moderated by AI", "No data stored", "algorithm", "encryption",
 * "machine learning", "database", "server", "administrators", "tab close",
 * "expires", "UUID", "session", "token", "architecture".
 *
 * Banned clinical terms (planet descriptions): "therapy", "treatment",
 * "diagnosis", "symptoms".
 *
 * @module landingCopy
 */

/** Hero section copy */
export const HERO = {
  /** ≤60 chars, no technical jargon */
  eyebrow: 'are you okay? just express yourself',
  /** ≤120 chars, ≤8th grade reading level */
  subtitle: 'A safe space where you can share how you truly feel. No names, no judgment, just people who understand.',
}

/** Statement section copy */
export const STATEMENT = {
  /** ≤50 chars */
  eyebrow: 'Your secret is safe here',
  /** ≤140 chars */
  headline: 'No one knows who you are. Not us, not other people. Just you, speaking freely.',
  /** ≤180 chars */
  subtitle: 'If you ever feel overwhelmed, we gently point you toward help. Your words are always protected, never silenced.',
}

/** CTA section copy */
export const CTA = {
  /** ≤50 chars */
  eyebrow: 'It\u2019s okay to need a place to talk',
  /** ≤60 chars */
  headline: 'Your feelings deserve a space.',
  /** ≤25 chars */
  buttonLabel: 'Step Inside',
}

/**
 * Planet descriptions — warm, second-person invitations.
 * Each planet ID matches the keys in the PLANETS array from planets.js.
 * All taglines use "you"/"your"/"you're" to address the reader directly.
 */
export const PLANET_DESCRIPTIONS = {
  joy: {
    /** 40–120 chars, second-person */
    tagline: 'Your wins deserve to be celebrated out loud.',
    /** ≤160 chars, describes what awaits */
    purpose: 'A bright corner where your gratitude, small victories, and happy moments are celebrated by people who get it.',
  },
  vent: {
    tagline: 'You don\u2019t have to hold any of it in anymore.',
    purpose: 'Let frustrations and academic burnout flow out \u2014 no filter, no consequence, just release.',
  },
  advice: {
    tagline: 'You\u2019re not alone in figuring any of this out.',
    purpose: 'Ask for peer guidance and receive fresh perspectives from students who have walked the same path.',
  },
  grief: {
    tagline: 'Your sadness has a safe place right here.',
    purpose: 'A quiet space to sit with loss, heartbreak, and the weight that others might not see.',
  },
  anxiety: {
    tagline: 'Your racing thoughts can slow down here.',
    purpose: 'Name the spiral. Share your worries with others who understand what overwhelm feels like.',
  },
  neutral: {
    tagline: 'Sometimes you just need to think out loud.',
    purpose: 'Calm observations, random thoughts, and the day-to-day musings that deserve space too.',
  },
  doodle: {
    tagline: 'When your words aren\u2019t enough, just draw.',
    purpose: 'A freeform canvas where your feelings become shapes and colors \u2014 no explanation needed.',
  },
}
