import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

/**
 * Mobile viewport height fix.
 * On iOS/Android browsers, 100vh includes the browser chrome (address bar,
 * bottom nav), making the actual visible area smaller. We set a CSS custom
 * property to the real inner height so `dvh` has a fallback.
 */
function setAppHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
}
setAppHeight()
window.addEventListener('resize', setAppHeight)

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
