import React, { useEffect, useState } from 'react'
import useAppStore from './store/useAppStore'
import LandingScreen from './screens/LandingScreen'
import AuthScreen from './screens/AuthScreen'
import AvatarScreen from './screens/AvatarScreen'
import CheckInScreen from './screens/CheckInScreen'
import SpaceScreen from './screens/SpaceScreen'
import CrisisModal from './components/modals/CrisisModal'
import PostModal from './components/modals/PostModal'
import DoodleModal from './components/modals/DoodleModal'
import ReportModal from './components/modals/ReportModal'
import AuthPromptModal from './components/modals/AuthPromptModal'
import AdminApp from './admin/AdminApp'
import OfflineIndicator from './components/ui/OfflineIndicator'
import Toast from './components/ui/Toast'

/** Minimal hash router — '#admin' opens the administration console. */
function useIsAdminRoute() {
  const [isAdmin, setIsAdmin] = useState(
    () => window.location.hash.replace('#', '') === 'admin'
  )

  useEffect(() => {
    const onHashChange = () =>
      setIsAdmin(window.location.hash.replace('#', '') === 'admin')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return isAdmin
}

export default function App() {
  const isAdmin = useIsAdminRoute()

  const {
    phase, initSession, initAuth, initGraphics, loadPrivateNotes,
    crisis, postModalOpen, reportTarget, selectedPlanet,
    setPostModalOpen, setSelectedPlanet, isAuthenticated,
  } = useAppStore()

  // Auth prompt state for guest write-gating
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const [authPlanetContext, setAuthPlanetContext] = useState(null)

  // Initialize auth listener + anonymous session + graphics settings on mount
  useEffect(() => {
    initAuth()
    initSession()
    initGraphics()
    loadPrivateNotes()
  }, [initAuth, initSession, initGraphics, loadPrivateNotes])

  // Selecting a planet only opens the post feed (PlanetInfoPanel) — reading
  // comes first. The composer is opened deliberately via the panel's
  // "Broadcast" button, which also handles guest write-gating.
  //
  // Deselecting a planet tears down any composer that was open, so the modal
  // can never outlive the planet it belongs to.
  useEffect(() => {
    if (!selectedPlanet) {
      setPostModalOpen(false)
      setAuthPromptOpen(false)
    }
  }, [selectedPlanet, setPostModalOpen])

  // The admin console renders on its own — the 3D canvas is never mounted here,
  // which also avoids allocating a WebGL context for administrative work.
  if (isAdmin) return <AdminApp />

  return (
    <div className={`relative w-full bg-space-900
                     ${phase === 'space' ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}
         style={{ height: 'var(--app-height, 100dvh)' }}>
      {/* Phase-based screen rendering */}
      {phase === 'landing' && <LandingScreen />}
      {phase === 'auth' && <AuthScreen />}
      {phase === 'avatar' && <AvatarScreen />}
      {phase === 'checkin' && <CheckInScreen />}
      {phase === 'space' && <SpaceScreen />}

      {/* Offline banner — renders below HUD on all screens */}
      <OfflineIndicator />

      {/* Global overlays — only show post/doodle modals if authenticated */}
      {(() => {
        if (postModalOpen && isAuthenticated) {
          console.log('[App] Modal should render. selectedPlanet?.id:', selectedPlanet?.id)
        }
        return null
      })()}
      {postModalOpen && isAuthenticated && selectedPlanet?.id === 'doodle' && <DoodleModal />}
      {postModalOpen && isAuthenticated && selectedPlanet?.id !== 'doodle' && <PostModal />}
      {reportTarget && <ReportModal />}
      {crisis.open && <CrisisModal />}

      {/* Global toast notifications — z-[200] renders above all other content */}
      <Toast />

      {/* Visually hidden live region for screen reader announcements
          (e.g., post added, state transitions) that aren't covered by Toast */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        id="announce-region"
      />

      {/* Auth prompt for guest write-gating — shown when guest selects a planet */}
      <AuthPromptModal
        open={authPromptOpen}
        onClose={() => { setAuthPromptOpen(false) }}
        planetContext={authPlanetContext}
      />
    </div>
  )
}
