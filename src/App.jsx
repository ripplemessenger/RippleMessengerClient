import React, { Suspense, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Routes, Route, Navigate } from 'react-router-dom'

import LoadingDiv from './components/LoadingDiv'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './layouts/MainLayout'
import OpenPage from './pages/OpenPage'

import useAuth from './hooks/useAuth'
import { getSettingBool } from './lib/SettingsUtil'

const AboutPage = React.lazy(() => import('./pages/AboutPage'))
const BulletinAddressPage = React.lazy(() => import('./pages/BulletinAddressPage'))
const BookmarkAddressPage = React.lazy(() => import('./pages/BulletinBookmarkPage'))
const BulletinFollowPage = React.lazy(() => import('./pages/BulletinFollowPage'))
const BulletinRandomPage = React.lazy(() => import('./pages/BulletinRandomPage'))
const BulletinTagPage = React.lazy(() => import('./pages/BulletinTagPage'))
const BulletinViewPage = React.lazy(() => import('./pages/BulletinViewPage'))
const ChatHomePage = React.lazy(() => import('./pages/ChatHomePage'))
const PortalPage = React.lazy(() => import('./pages/PortalPage'))
const ServerAddressPage = React.lazy(() => import('./pages/ServerAddressPage'))
const SettingPage = React.lazy(() => import('./pages/SettingPage'))

function App() {
  // Sync persisted settings to Rust backend on startup
  useEffect(() => {
    invoke('set_close_to_tray', { closeToTray: getSettingBool('closeToTray', false) }).catch(() => {})
    invoke('set_start_minimized', { startMinimized: getSettingBool('startMinimized', false) }).catch(() => {})
  }, [])

  return (
    <Suspense fallback={<LoadingDiv isLoading={true} />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<RootRouter />} />
          <Route path="/about" element={<AboutPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/bulletin_follow" element={<BulletinFollowPage />} />
            <Route path="/bulletin_tag" element={<BulletinTagPage />} />
            <Route path="/bulletin_random" element={<BulletinRandomPage />} />
            <Route path="/bulletin_address" element={<BulletinAddressPage />} />
            <Route path="/bulletin_bookmark" element={<BookmarkAddressPage />} />
            <Route path="/bulletin_view" element={<BulletinViewPage />} />
            {/* <Route path="/bulletin_view/:bulletin_hash" element={<BulletinViewPage />} /> */}
            <Route path="/server_address" element={<ServerAddressPage />} />
            <Route path="/chat" element={<ChatHomePage />} />
            <Route path="/setting" element={<SettingPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

function RootRouter() {
  const { IsAuth, loading } = useAuth()

  if (loading) {
    return <LoadingDiv isLoading={true} text="Loading..." />
  }

  return IsAuth ? <PortalPage /> : <OpenPage />
}

export default App
