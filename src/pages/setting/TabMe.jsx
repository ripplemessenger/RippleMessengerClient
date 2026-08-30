import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { open } from '@tauri-apps/plugin-dialog'
import { readFile } from '@tauri-apps/plugin-fs'
import QRCode from 'qrcode'
import { IoCloseOutline } from 'react-icons/io5'
import AvatarImage from '../../components/AvatarImage'
import TextInput from '../../components/Form/TextInput'

import { useConfirmPopup } from '../../hooks/useConfirmPopup'
import { selectUserTabMe } from '../../selectors'
import { ConfirmContentOptions, FLASH_DURATION_MS, SettingPageTab } from '../../lib/AppConst'
import { DefaultServer } from '../../lib/MessengerConst'
import Logger from '../../lib/Logger'
import { setConfirmPopup, setFlashNoticeMessage } from '../../store/slices/CommonSlice'
import { setNickname } from '../../store/slices/UserSlice'
import { AccountDel, ContactAdd } from '../../store/sagas/messenger.actions'

const AvatarCropper = lazy(() => import('../../components/AvatarCropper'))

export default function TabMe() {
  const { t } = useTranslation()
  const [displayNickname, setDisplayNickname] = useState('')
  const [imageSrc, setImageSrc] = useState(null)
  const blobUrlRef = useRef(null)
  const [imageTimestamp, setImageTimestamp] = useState(Date.now())
  const [showRemoveButton, setShowRemoveButton] = useState(false)

  const dispatch = useDispatch()
  const { Address, Nickname, Seed, AccountList, activeTabSetting } = useSelector(selectUserTabMe)
  const ServerList = useSelector((state) => state.Messenger.ServerList)
  const [showQrCode, setShowQrCode] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState(null)

  // QR code value: address@server (same format the App scanner expects)
  const qrValue = Address ? `${Address}@${ServerList[0]?.url || DefaultServer}` : ''

  useEffect(() => {
    if (showQrCode && qrValue) {
      QRCode.toDataURL(qrValue, { width: 240, margin: 2, errorCorrectionLevel: 'M' })
        .then(setQrDataUrl)
        .catch((e) => Logger.error('[QRCode] generate failed:', e.message))
    }
  }, [showQrCode, qrValue])

  useEffect(() => {
    if (activeTabSetting === SettingPageTab.Me) {
      setDisplayNickname(Nickname)
    }
  }, [activeTabSetting, Nickname])

  useEffect(() => {
    setShowRemoveButton(AccountList.some((a) => a.address === Address))
  }, [AccountList, Address])

  const browseAvatarSource = async () => {
    const file = await open({
      multiple: false,
      directory: false
    })

    if (file) {
      // Revoke previous blob URL to prevent memory leak
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
      const bytes = await readFile(file)
      const blob = new Blob([new Uint8Array(bytes)])
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url
      setImageSrc(url)
    }
  }

  const updateNickname = (value) => {
    value = value.trim()
    setDisplayNickname(value)

    if (value !== '') {
      dispatch(ContactAdd({ address: Address, nickname: value }))
      dispatch(setNickname(value))
    }
  }

  const closeAvatarCropper = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setImageSrc(null)
    setImageTimestamp(Date.now())
  }

  const confirmPopup = useConfirmPopup()
  useEffect(() => {
    if (confirmPopup?.Content === ConfirmContentOptions.RemoveAccount && confirmPopup?.Result) {
      dispatch(AccountDel({ address: Address }))
      dispatch(setConfirmPopup(null))
    }
    if (confirmPopup?.Content === ConfirmContentOptions.CopySeed && confirmPopup?.Result) {
      navigator.clipboard.writeText(Seed).then(() => {
        dispatch(setFlashNoticeMessage({ message: t('chat.copy_seed_success'), duration: FLASH_DURATION_MS }))
      })
      dispatch(setConfirmPopup(null))
    }
  }, [confirmPopup?.Content, confirmPopup?.Result, dispatch, Address, Seed])

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
      }
    }
  }, [])

  const confirmDelAccount = (_address) => {
    dispatch(
      setConfirmPopup({
        Content: ConfirmContentOptions.RemoveAccount,
        Message: 'Remove this account? All local data will be deleted.',
        Result: false
      })
    )
  }

  const confirmCopySeed = () => {
    dispatch(
      setConfirmPopup({
        Content: ConfirmContentOptions.CopySeed,
        Message: 'Copy your account seed to clipboard?',
        Result: false
      })
    )
  }

  return (
    <div className="tab-page">
      {showQrCode && (
        <div className={`modal-overlay`} role="dialog" aria-modal="true">
          <div className="max-w-sm w-full mx-4 flex flex-col mt-4">
            <div className="modal-header-bar">
              <span className={`label text-base`}>{t('setting.qr_code')}</span>
              <button
                onClick={() => setShowQrCode(false)}
                className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                aria-label={t('common.close')}
              >
                <IoCloseOutline className="text-lg text-text-secondary dark:text-dark-text-secondary" />
              </button>
            </div>
            <div className="modal-content-area gap-3 flex flex-col items-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={t('setting.qr_code')} className="w-60 h-60 rounded-lg" />
              ) : (
                <div className="w-60 h-60 flex items-center justify-center text-text-secondary">
                  {t('auth.decrypting')}
                </div>
              )}
              <p className="text-sm text-text-secondary dark:text-dark-text-secondary text-center break-all px-4">
                {qrValue}
              </p>
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary text-center">
                {t('setting.qr_hint')}
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto flex flex-col mt-4 w-full max-w-full min-w-0">
        <div className="card-title">{t('setting.tab_me')}</div>
        <div className="w-full max-w-full min-w-0 rounded-xl card p-6 flex flex-col items-center gap-4">
          {Address && (
            <AvatarImage
              address={Address}
              timestamp={imageTimestamp}
              onClick={() => browseAvatarSource()}
              classNames={'avatar'}
            />
          )}
          <TextInput
            label={t('ui.nickname')}
            value={displayNickname}
            autoComplete={'off'}
            placeholder={'Alice'}
            onChange={(e) => updateNickname(e.target.value)}
          />
          {imageSrc && (
            <Suspense fallback={null}>
              <AvatarCropper address={Address} imageSrc={imageSrc} onClose={() => closeAvatarCropper()} />
            </Suspense>
          )}
          {Address && (
            <button onClick={() => setShowQrCode(true)} className="btn-primary btn-gold">
              {t('setting.qr_code')}
            </button>
          )}
          <button onClick={() => confirmCopySeed()} className="btn-primary btn-yellow">
            {t('auth.copy_seed')}
          </button>
          {showRemoveButton && (
            <button onClick={() => confirmDelAccount()} className="btn-primary btn-red">
              {t('auth.remove_account')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
