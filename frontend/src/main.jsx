import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import useAppStore from './store/useAppStore'
import { initViewportProperties } from './lib/viewport'
import './index.css'

// ── Viewport Custom Properties ──────────────────────────────────────────────
// Sets --app-height, --hud-height, --nav-height, --safe-top, --safe-bottom,
// --content-height on :root and listens for resize/orientationchange to keep
// them updated. Replaces the old `setAppHeight` one-liner.
initViewportProperties()

// ── Service Worker Registration ─────────────────────────────────────────────
// Uses vite-plugin-pwa's virtual module. Registration is non-blocking —
// if it fails, the app continues normally as a standard web app.
try {
  registerSW({
    onRegisteredSW(swUrl, registration) {
      // SW registered successfully — nothing to do, autoUpdate handles lifecycle
      console.log('[SW] Registered:', swUrl)
    },
    onRegisterError(error) {
      console.error('[SW] Registration failed:', error)
    },
  })
} catch (err) {
  console.error('[SW] Registration failed:', err)
}

// ── Offline State Detection ─────────────────────────────────────────────────
// Sync the browser's online/offline status with the Zustand store so
// components (like OfflineIndicator) can react to connectivity changes.
const { setIsOffline } = useAppStore.getState()

// Set initial offline state
setIsOffline(!navigator.onLine)

// Listen for online/offline events
window.addEventListener('online', () => {
  useAppStore.getState().setIsOffline(false)
})

window.addEventListener('offline', () => {
  useAppStore.getState().setIsOffline(true)
})

// Listen for messages from the service worker (e.g. offline fallback responses)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'OFFLINE_STATUS') {
      useAppStore.getState().setIsOffline(event.data.isOffline)
    }
  })
}

/**
 * StrictMode is intentionally omitted.
 *
 * In development StrictMode mounts components twice, which makes
 * react-three-fiber create two WebGL contexts per reload. Browsers cap the
 * number of live contexts (typically 8–16), so repeated hot reloads exhaust
 * the limit and the GPU starts dropping them — surfacing as
 * "THREE.WebGLRenderer: Context Lost".
 */
ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
