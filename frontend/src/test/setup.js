import '@testing-library/jest-dom'

// Polyfill window.matchMedia for jsdom (required by useOrientation, useIsSmallScreen, etc.)
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}

// Polyfill ResizeObserver for jsdom (required by PlanetInfoPanel overflow detection)
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
