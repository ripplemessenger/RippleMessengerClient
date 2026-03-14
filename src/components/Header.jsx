import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useTheme } from './ThemeProvider.jsx'
import useAuth from '../hooks.jsx/useAuth.js'

import { GiBugleCall } from "react-icons/gi"
import { IoChatboxEllipsesOutline, IoSettingsOutline, IoReloadSharp, IoArrowForwardSharp, IoArrowBackSharp } from "react-icons/io5"
import { FiSun, FiMoon, FiLogOut, FiLogIn } from "react-icons/fi"
import { HiOutlineStatusOnline, HiOutlineStatusOffline } from "react-icons/hi"
import NavBarIconLink from './NavBarIconLink.jsx'
import NavBarIconButton from './NavBarIconButton.jsx'
import InternalLink from './InternalLink.jsx'
import { useLocalStorage } from '../hooks/useLocalStorage.js'

export default function Header() {
  const [isDark, setIsDark] = useLocalStorage('isDark', false)

  const { IsAuth, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const { MessengerConnStatus, SessionNewMsgCount } = useSelector(state => state.Messenger)
  const { Address } = useSelector(state => state.User)

  return (

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
            IsAuth &&
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
                count={SessionNewMsgCount}
              />
              <NavBarIconLink
                path="/setting"
                icon={<IoSettingsOutline className="icon" />}
                label="Setting"
              />
              <NavBarIconButton
                icon={<FiLogOut className="icon" />}
                label="Close"
                onClick={logout}
              />
            </div>
          }
        </div>
      </div>
    </nav>
  )
}