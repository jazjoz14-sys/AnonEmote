import React, { useEffect, useState } from 'react'
import useAppStore from './store/useAppStore'
import LandingScreen from './screens/LandingScreen'
import AvatarScreen from './screens/AvatarScreen'
import CheckInScreen from './screens/CheckInScreen'
import SpaceScreen from './screens/SpaceScreen'
import CrisisModal from './components/modals/CrisisModal'
import PostModal from './components/modals/PostModal'
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

  const { phase, initSession, crisisModalOpen, postModalOpen, reportTarget } =
    useAppStore()

  // Initialize anonymous session on mount
  useEffect(() => {
    initSession()
  }, [initSession])

  // The admin console renders on its own — the 3D canvas is never mounted here,
  // which also avoids allocating a WebGL context for administrative work.
  if (isAdmin) return <AdminApp />

  return (
    <div className="relative w-full h-full overflow-hidden bg-space-900">
      {/* Phase-based screen rendering */}
      {phase === 'landing' && <LandingScreen />}
      {phase === 'avatar' && <AvatarScreen />}
      {phase === 'checkin' && <CheckInScreen />}
      {phase === 'space' && <SpaceScreen />}

      {/* Global overlays, layered above everything */}
      {postModalOpen && <PostModal />}
      {reportTarget && <ReportModal />}
      {crisisModalOpen && <CrisisModal />}
    </div>
  )
}
