import { useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'

import PortalPage from './pages/PortalPage'
import AboutPage from './pages/AboutPage'
import OpenPage from './pages/OpenPage'
import SettingPage from './pages/SettingPage'
import BulletinHomePage from './pages/BulletinHomePage'
import BulletinViewPage from './pages/BulletinViewPage'
import ChatHomePage from './pages/ChatHomePage'

import NavBarIconLink from './components/NavBarIconLink'
import NavBarIconButton from './components/NavBarIconButton'
import ExternalLink from './components/ExternalLink'
import InternalLink from './components/InternalLink'

import { useLocalStorage } from './hooks/useLocalStorage'
import { loginStart, logoutStart } from './store/slices/UserSlice'

import { GiBugleCall } from "react-icons/gi"
import { IoChatboxEllipsesOutline, IoSettingsOutline, IoReloadSharp, IoArrowForwardSharp, IoArrowBackSharp } from "react-icons/io5"
import { FiSun, FiMoon, FiLogOut, FiLogIn } from "react-icons/fi"
import { HiOutlineStatusOnline, HiOutlineStatusOffline } from "react-icons/hi"
import FlashNotice from './components/FlashNotice'
import JsonDiv from './components/JsonDiv'

function App() {
  const [isDark, setIsDark] = useLocalStorage('isDark', false)

  const { MessengerConnStatus } = useSelector(state => state.Messenger)
  const { Address, IsAuth, FlashNoticeMessage, DisplayJson, FlashNoticeDuration } = useSelector(state => state.User)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  // route
  const location = useLocation()
  const UnAuthPaths = ['/open']
  const AuthPaths = ['/setting', '/console', '/bulletin', '/bulletin_view', '/chat']
  const GeneralPaths = ['/', '/about', '/histroy']

  useEffect(() => {
    let isGeneralPath = GeneralPaths.includes(location.pathname)
    let isAuthPaths = AuthPaths.includes(location.pathname)
    let isUnAuthPaths = UnAuthPaths.includes(location.pathname)
    const localSeed = localStorage.getItem("Seed")
    const localAddress = localStorage.getItem("Address")

    if (!IsAuth && localSeed) {
      dispatch(loginStart({ seed: localSeed, address: localAddress }))
    }

    if (isGeneralPath) {
      return
    } else if (localAddress && isUnAuthPaths) {
      navigate('/bulletin')
    } else if (!localAddress && isAuthPaths) {
      navigate('/open')
    }
  }, [navigate])

  const userLogout = () => {
    console.log('userLogout')
    dispatch(logoutStart())
    navigate('/')
  }

  // theme
  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    document.documentElement.classList.toggle('dark', newIsDark)
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light')
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const initialTheme = savedTheme || (systemDark ? 'dark' : 'light')
    setIsDark(initialTheme === 'dark')
    document.documentElement.classList.toggle('dark', initialTheme === 'dark')

    dispatch({ type: 'LoadAppBaseDir' })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {
        FlashNoticeMessage &&
        <FlashNotice message={FlashNoticeMessage} duration={FlashNoticeDuration} />
      }
      {
        DisplayJson &&
        <JsonDiv json={DisplayJson} />
      }
      <nav className="nav bar">
        <div className="mx-auto max-w-7xl flex justify-between items-center px-8">
          <div className="flex items-center">
            <InternalLink path={"/"} title={"RippleMessenger"} text_size={"text-2xl"} />
            <div className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50">
              {
                MessengerConnStatus ?
                  <HiOutlineStatusOnline className="icon text-green-600 dark:text-green-400" />
                  :
                  <HiOutlineStatusOffline className="icon text-red-600 dark:text-red-400" />
              }
            </div>
            <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
              {isDark ?
                <FiSun className="icon" />
                :
                <FiMoon className="icon" />}
            </button>
          </div>

          <div className="hidden md:flex space-x-2">
            {
              IsAuth ?
                <div className="flex flex-row items-center">
                  <span className="pl-4">
                    {Address}
                  </span>
                  <NavBarIconLink
                    path="/bulletin"
                    icon={<GiBugleCall className="icon" />}
                    label="Bulletin"
                  />
                  <NavBarIconLink
                    path="/chat"
                    icon={<IoChatboxEllipsesOutline className="icon" />}
                    label="Chat"
                  />
                  <NavBarIconLink
                    path="/setting"
                    icon={<IoSettingsOutline className="icon" />}
                    label="Setting"
                  />
                  <NavBarIconButton
                    icon={<FiLogOut className="icon" />}
                    label="Close"
                    onClick={userLogout}
                  />
                </div>
                :
                <div className="flex flex-row items-center">
                  <NavBarIconLink
                    path="/open"
                    icon={<FiLogIn className="icon" />}
                    label="Open"
                  />
                </div>
            }
          </div>
        </div>
      </nav>

      <main className="main flex-grow">
        <div className="mx-auto mt-16 max-w-6xl h-full p-2 rounded-lg">
          <Routes>
            {/* general */}
            <Route path="/" element={<PortalPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/setting" element={<SettingPage />} />

            {/* unAuth */}
            <Route path="/open" element={<OpenPage />} />

            {/* auth */}
            <Route path="/bulletin" element={<BulletinHomePage />} />
            <Route path="/bulletin_view" element={<BulletinViewPage />} />
            {/* <Route path="/bulletin_view/:bulletin_hash" element={<BulletinViewPage />} /> */}
            <Route path="/chat" element={<ChatHomePage />} />
          </Routes>
        </div>
      </main>

      <footer className="footer bar">
        <div className="mx-auto max-w-7xl flex justify-between items-center px-8">
          <ExternalLink href={"https://github.com/RippleMessenger/RippleMessengerClient"} title={"RippleMessenger"} text_size={"text-base"} />
          <div className="flex justify-center items-center">
            <button
              onClick={() => window.history.back()}
              className="px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
            >
              <IoArrowBackSharp className="icon" />
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
            >
              <IoReloadSharp className="icon" />
            </button>
            <button
              onClick={() => window.history.forward()}
              className="px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
            >
              <IoArrowForwardSharp className="icon" />
            </button>
          </div>
          <div className="flex space-x-4">
            <InternalLink path={"/about"} title={"About"} text_size={"text-base"} />
          </div>
        </div>
      </footer>
    </div >
  )
}

export default App