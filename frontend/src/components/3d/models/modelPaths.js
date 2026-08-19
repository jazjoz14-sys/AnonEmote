/**
 * Model path constants and utilities for GLB asset loading.
 *
 * All model paths are derived programmatically from IDs — no hardcoded
 * file paths in rendering components.
 *
 * @module modelPaths
 */

/**
 * Valid planet IDs matching the `id` field in planets.js.
 * @type {string[]}
 */
export const PLANET_IDS = [
  'joy',
  'vent',
  'advice',
  'grief',
  'anxiety',
  'neutral',
  'doodle',
];

/**
 * Valid avatar shape IDs matching the `id` field in avatarOptions.js.
 * @type {string[]}
 */
export const AVATAR_IDS = [
  'clover',
  'crystal',
  'droplet',
  'heart',
  'moon',
  'ribbon',
  'ring',
  'shard',
  'spark',
  'spirit',
];

/**
 * Derives the public path to a GLB model file from its ID and category.
 *
 * Path pattern: `/models/{category}s/{id}.glb`
 * Examples:
 *   getModelPath('joy', 'planet')   → '/models/planets/joy.glb'
 *   getModelPath('orb', 'avatar')   → '/models/avatars/orb.glb'
 *
 * @param {string} id - Lowercase a-z model identifier (e.g. 'joy', 'orb')
 * @param {'planet' | 'avatar'} category - Model category (singular)
 * @returns {string} Absolute public path to the GLB file
 */
export function getModelPath(id, category) {
  return `/models/${category}s/${id}.glb`;
}

/**
 * Pre-computed paths for all 7 planet GLB models.
 * @type {string[]}
 */
export const PLANET_MODEL_PATHS = PLANET_IDS.map((id) => getModelPath(id, 'planet'));

/**
 * Pre-computed paths for all 10 avatar GLB models.
 * @type {string[]}
 */
export const AVATAR_MODEL_PATHS = AVATAR_IDS.map((id) => getModelPath(id, 'avatar'));
