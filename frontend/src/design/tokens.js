/**
 * Design token constants for runtime use.
 * These complement the Tailwind theme — used where JS logic
 * needs to reference token values (z-index stacking, breakpoints, sizes).
 */

/** Z-index stacking order — single source of truth. */
export const Z = {
  BOTTOM_SHEET_BACKDROP: 29,
  BOTTOM_SHEET: 30,
  POST_MODAL: 50,
  DOODLE_MODAL: 50,
  AUTH_PROMPT: 50,
  SETTINGS_PANEL: 55, // Above HUD (z-20) and post modals (50), below report/crisis modals
  CONFIRM_DIALOG: 60,
  REPORT_MODAL: 90,
  CRISIS_MODAL: 100,
  TOAST: 200,
}

/** Responsive breakpoints (matches Tailwind's defaults + our custom tiers). */
export const BREAKPOINTS = {
  NARROW: 380,
  MOBILE: 768,
  LANDSCAPE_HEIGHT: 500,
}

/** Touch target minimum dimensions (WCAG / Apple HIG). */
export const TOUCH = {
  MIN_SIZE: 44, // px
}

/** Maximum content widths for modals/panels. */
export const MAX_WIDTH = {
  AUTH_CARD: 384,
  CRISIS_CARD: 480,
  REPORT_CARD: 448,
  POST_PANEL_MOBILE: 440,
  POST_PANEL_DESKTOP: 480,
  LANDSCAPE_MODAL: 480,
}

/** Chrome budget (HUD + PlanetNav) for mobile SpaceScreen. */
export const CHROME = {
  HUD_HEIGHT: 40,
  NAV_HEIGHT: 44,
  TOTAL: 84,
}
