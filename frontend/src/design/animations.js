/**
 * Animation utilities that respect prefers-reduced-motion.
 *
 * These helpers ensure animations are only applied when the user
 * hasn't requested reduced motion via their OS/browser settings.
 *
 * Strategy: Tailwind's `motion-safe:` variant prefix gates all animation
 * classes so they only apply when prefers-reduced-motion is NOT set to reduce.
 * The global CSS fallback in index.css forces animation/transition durations
 * to 0.01ms when reduced motion is active as a safety net.
 */

/**
 * Prefixes a class with `motion-safe:` so Tailwind only applies
 * it when prefers-reduced-motion is NOT set to reduce.
 *
 * @param {string} className - The animation/transition class to wrap
 * @returns {string} The motion-safe prefixed class
 *
 * @example
 * motionSafe('animate-fade-in') // → 'motion-safe:animate-fade-in'
 * motionSafe('transition-all')  // → 'motion-safe:transition-all'
 */
export function motionSafe(className) {
  return `motion-safe:${className}`
}

/**
 * Conditionally returns an animation class based on reduced motion preference.
 * Returns empty string when reduced motion is preferred, allowing safe
 * inline usage in className concatenation.
 *
 * @param {string} animationClass - The animation class to apply
 * @param {boolean} prefersReducedMotion - Whether reduced motion is preferred
 * @returns {string} The animation class or empty string
 *
 * @example
 * getAnimationClass('animate-slide-up', false) // → 'animate-slide-up'
 * getAnimationClass('animate-slide-up', true)  // → ''
 */
export function getAnimationClass(animationClass, prefersReducedMotion) {
  return prefersReducedMotion ? '' : animationClass
}

/**
 * Returns multiple animation-related classes, all gated by motion preference.
 * Useful when a component needs several animation/transition classes applied together.
 *
 * @param {string[]} classes - Array of animation/transition classes
 * @param {boolean} prefersReducedMotion - Whether reduced motion is preferred
 * @returns {string} Space-joined classes or empty string
 *
 * @example
 * getAnimationClasses(['animate-fade-in', 'transition-all', 'duration-200'], false)
 * // → 'animate-fade-in transition-all duration-200'
 *
 * getAnimationClasses(['animate-fade-in', 'transition-all'], true)
 * // → ''
 */
export function getAnimationClasses(classes, prefersReducedMotion) {
  if (prefersReducedMotion) return ''
  return classes.join(' ')
}
