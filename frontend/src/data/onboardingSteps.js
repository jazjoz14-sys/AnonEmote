/**
 * Onboarding tutorial step definitions.
 * Each step describes a feature of the AnonEmote star system that new users
 * are guided through after completing avatar creation and emotion check-in.
 *
 * @typedef {Object} OnboardingStep
 * @property {string} id - Unique identifier for the step
 * @property {string} title - Display title shown in the tooltip
 * @property {string} description - Explanatory text for the step
 * @property {string|null} highlightSelector - CSS selector for the DOM element to highlight, or null for full-scene steps
 */

/** @type {OnboardingStep[]} */
export const ONBOARDING_STEPS = [
  {
    id: 'central-star',
    title: 'The Central Star',
    description: 'This is your emotional constellation. Each planet orbiting represents a feeling category.',
    highlightSelector: null, // no specific element — full scene visible
  },
  {
    id: 'planet-click',
    title: 'Click a Planet',
    description: 'Tap any orbiting planet to explore posts from others who feel the same way.',
    highlightSelector: '[data-onboarding="planet-nav"]',
  },
  {
    id: 'post-composer',
    title: 'Broadcast Your Feelings',
    description: 'Once inside a planet, tap "Broadcast" to share what\'s on your mind — fully anonymous.',
    highlightSelector: '[data-onboarding="broadcast-btn"]',
  },
  {
    id: 'reactions',
    title: 'Empathy Reactions',
    description: 'Send support with empathy-only reactions: 🫂💙😢🌱✨ — no likes, no downvotes.',
    highlightSelector: '[data-onboarding="reactions"]',
  },
  {
    id: 'doodle-drift',
    title: 'Doodle Drift',
    description: 'Visit the Doodle Drift planet to express yourself through drawing instead of words.',
    highlightSelector: '[data-onboarding="doodle-planet"]',
  },
  {
    id: 'crisis-net',
    title: 'Crisis Safety Net',
    description: 'If the system detects distress, it will never delete your words — it preserves them and shows crisis support resources.',
    highlightSelector: null,
  },
]
