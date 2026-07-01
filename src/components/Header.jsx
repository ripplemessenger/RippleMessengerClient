import { memo } from 'react'
import { useSelector } from 'react-redux'
import { FiLogOut, FiMoon, FiSun } from 'react-icons/fi'
import { HiOutlineStatusOffline, HiOutlineStatusOnline } from 'react-icons/hi'
import { IoChatboxEllipsesOutline, IoSettingsOutline } from 'react-icons/io5'

import BulletinAvatarLink from './Bulletin/BulletinAvatarLink'
import InternalLink from './InternalLink'
import NavBarIconButton from './NavBarIconButton'
import NavBarIconLink from './NavBarIconLink'
import { useTheme } from './ThemeProvider'
import { selectMessengerConnStatus, selectTotalNewMessages } from '../selectors'
import useAuth from '../hooks/useAuth'

function Header() {

  const { IsAuth, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const MessengerConnStatus = useSelector(selectMessengerConnStatus)
  const SessionNewMsgCount = useSelector(selectTotalNewMessages)
  const { Address } = useSelector(state => state.User)

  return (

    <nav className="nav bar">
      <div className="mx-auto max-w-7xl flex justify-between items-center px-8">
        <div className="flex items-center">
          <InternalLink path={"/"} title={"RippleMessenger"} text_size={"text-2xl"} />
          <div className="nav-icon-btn">
            {
              MessengerConnStatus ?
                <HiOutlineStatusOnline className="icon text-status-success dark:text-status-success-dark" />
                :
                <HiOutlineStatusOffline className="icon text-status-error dark:text-status-error-dark" />
            }
          </div>
          <button onClick={toggleTheme} className="nav-icon-btn" aria-label="Toggle theme">
            {theme === 'light' ?
              <FiSun className="icon" />
              :
              <FiMoon className="icon" />}
          </button>
        </div>

        <div className="hidden md:flex space-x-2">
          {
            IsAuth &&
            <div className="flex flex-row items-center">
              <BulletinAvatarLink address={Address} classNames={'avatar-sm'} />
              <span>
                {Address}
              </span>
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

export default memo(Header)