import { Routes, Route, Navigate } from 'react-router-dom'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import ProtectedRoute from './components/ProtectedRoute'

import OpenPage from './pages/OpenPage'
import PortalPage from './pages/PortalPage'
import AboutPage from './pages/AboutPage'
import MainLayout from './layouts/MainLayout'
import useAuth from './hooks.jsx/useAuth'
import BulletinHomePage from './pages/BulletinHomePage'
import BulletinTagPage from './pages/BulletinTagPage'
import BulletinViewPage from './pages/BulletinViewPage'
import ChatHomePage from './pages/ChatHomePage'
import SettingPage from './pages/SettingPage'
import BulletinAddressPage from './pages/BulletinAddressPage'
import BookmarkAddressPage from './pages/BulletinBookmarkPage'

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<RootRouter />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/about" element={<AboutPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/bulletin" element={<BulletinHomePage />} />
          <Route path="/bulletin_tag" element={<BulletinTagPage />} />
          <Route path="/bulletin_address" element={<BulletinAddressPage />} />
          <Route path="/bulletin_bookmark" element={<BookmarkAddressPage />} />
          <Route path="/bulletin_view" element={<BulletinViewPage />} />
          {/* <Route path="/bulletin_view/:bulletin_hash" element={<BulletinViewPage />} /> */}
          <Route path="/chat" element={<ChatHomePage />} />
          <Route path="/setting" element={<SettingPage />} />

        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function RootRouter() {
  const { IsAuth, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return IsAuth ? <PortalPage /> : <OpenPage />
}

export default App