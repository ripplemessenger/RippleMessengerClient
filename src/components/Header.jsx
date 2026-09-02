import { memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FiLogOut } from 'react-icons/fi'
import { IoChatboxEllipsesOutline, IoNewspaperOutline, IoPeopleOutline, IoSettingsOutline } from 'react-icons/io5'

import BulletinAvatarLink from './Bulletin/BulletinAvatarLink'
import InternalLink from './InternalLink'
import NavBarIconButton from './NavBarIconButton'
import NavBarIconLink from './NavBarIconLink'
import { selectUserAddress, selectMessengerConnStatus, selectTotalNewMessages } from '../selectors'
import useAuth from '../hooks/useAuth'
import { FLASH_DURATION_MS } from '../lib/AppConst'
import { setFlashNoticeMessage } from '../store/slices/CommonSlice'

function Header() {
  const { t } = useTranslation()

  const { IsAuth, logout } = useAuth()

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const MessengerConnStatus = useSelector(selectMessengerConnStatus)
  const SessionNewMsgCount = useSelector(selectTotalNewMessages)
  const Address = useSelector(selectUserAddress)

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(Address).then(() => {
      dispatch(setFlashNoticeMessage({ message: t('common.copied_to_clipboard'), duration: FLASH_DURATION_MS }))
    })
  }

  const handleContactClick = () => {
    navigate('/contact')
  }

  return (
    <nav className="nav bar">
      <div className="mx-auto max-w-7xl flex justify-between items-center px-8">
        <div className="flex items-center">
          <InternalLink path={'/'} title={'RippleMessenger'} text_size={'text-2xl'} />
        </div>

        <div className="hidden md:flex space-x-2">
          {IsAuth && (
            <div className="flex flex-row items-center">
              <BulletinAvatarLink address={Address} classNames={'avatar-sm'} />
              <button
                onClick={handleCopyAddress}
                title={t('common.copy')}
                className={`cursor-pointer hover:underline focus:outline-none ${
                  MessengerConnStatus
                    ? 'text-status-success dark:text-status-success-dark'
                    : 'text-status-error dark:text-status-error-dark'
                }`}
              >
                {Address}
              </button>
              <NavBarIconLink
                path="/bulletin"
                icon={<IoNewspaperOutline className="icon" />}
                label={t('common.bulletin')}
              />
              <NavBarIconLink
                path="/chat"
                icon={<IoChatboxEllipsesOutline className="icon" />}
                label={t('common.chat')}
                count={SessionNewMsgCount}
              />
              <button
                onClick={handleContactClick}
                className="p-2 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 flex flex-col items-center justify-center focus:outline-none overflow-visible"
              >
                <IoPeopleOutline className="icon" />
                <span className="text-sm text-text-primary dark:text-dark-text-primary">{t('common.contact')}</span>
              </button>
              <NavBarIconLink
                path="/setting"
                icon={<IoSettingsOutline className="icon" />}
                label={t('common.setting')}
              />
              <NavBarIconButton icon={<FiLogOut className="icon" />} label={t('common.close')} onClick={logout} />
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default memo(Header)
