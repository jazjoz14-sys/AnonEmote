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
import AdminApp from './admin/AdminApp'

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
    phase, initSession, initAuth, loadPrivateNotes,
    crisis, postModalOpen, reportTarget, selectedPlanet,
    setPostModalOpen, isAuthenticated,
  } = useAppStore()

  // Initialize auth listener + anonymous session on mount
  useEffect(() => {
    initAuth()
    initSession()
    loadPrivateNotes()
  }, [initAuth, initSession, loadPrivateNotes])

  // Auto-open post modal when a planet is selected (only for authenticated users)
  useEffect(() => {
    if (selectedPlanet && isAuthenticated) {
      setPostModalOpen(true)
    } else if (!selectedPlanet) {
      setPostModalOpen(false)
    }
  }, [selectedPlanet, isAuthenticated, setPostModalOpen])

  // The admin console renders on its own — the 3D canvas is never mounted here,
  // which also avoids allocating a WebGL context for administrative work.
  if (isAdmin) return <AdminApp />

  return (
    <div className={`relative w-full h-full bg-space-900
                     ${phase === 'space' ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'}`}
         style={{ height: '100%' }}>
      {/* Phase-based screen rendering */}
      {phase === 'landing' && <LandingScreen />}
      {phase === 'auth' && <AuthScreen />}
      {phase === 'avatar' && <AvatarScreen />}
      {phase === 'checkin' && <CheckInScreen />}
      {phase === 'space' && <SpaceScreen />}

      {/* Global overlays — only show post/doodle modals if authenticated */}
      {postModalOpen && isAuthenticated && selectedPlanet?.id === 'doodle' && <DoodleModal />}
      {postModalOpen && isAuthenticated && selectedPlanet?.id !== 'doodle' && <PostModal />}
      {reportTarget && <ReportModal />}
      {crisis.open && <CrisisModal />}
    </div>
  )
}
