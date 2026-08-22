import React, { useState, useCallback, useEffect } from 'react'
import { getToken, clearToken, adminLogout } from './adminApi'
import AdminLogin from './AdminLogin'
import AdminLayout from './AdminLayout'

/**
 * AdminApp — the administration console root.
 *
 * Handles authentication state and body scroll override.
 * When authenticated, delegates all layout and navigation to AdminLayout.
 */
export default function AdminApp() {
  const [authed, setAuthed] = useState(!!getToken())

  // The main app locks body scroll for the 3D canvas; the console needs it back.
  useEffect(() => {
    const root = document.getElementById('root')
    const prevOverflow = document.body.style.overflow
    const prevHeight = document.body.style.height
    const prevRootOverflow = root?.style.overflow
    const prevRootPosition = root?.style.position
    const prevRootHeight = root?.style.height
    const prevRootInset = root?.style.inset

    document.body.style.overflow = 'auto'
    document.body.style.height = 'auto'
    if (root) {
      root.style.overflow = 'auto'
      root.style.position = 'static'
      root.style.height = 'auto'
      root.style.inset = 'unset'
    }

    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.height = prevHeight
      if (root) {
        root.style.overflow = prevRootOverflow
        root.style.position = prevRootPosition
        root.style.height = prevRootHeight
        root.style.inset = prevRootInset
      }
    }
  }, [])

  /** Called by any page that receives a 401 — forces re-authentication. */
  const handleAuthError = useCallback(() => {
    clearToken()
    setAuthed(false)
  }, [])

  const handleLogout = async () => {
    try { await adminLogout() } catch { /* token may already be invalid */ }
    clearToken()
    setAuthed(false)
  }

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />

  return <AdminLayout onLogout={handleLogout} onAuthError={handleAuthError} />
}
