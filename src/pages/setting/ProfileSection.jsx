import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { open } from '@tauri-apps/plugin-dialog'
import { readFile } from '@tauri-apps/plugin-fs'
import QRCode from 'qrcode'
import { IoCloseOutline, IoPersonOutline } from 'react-icons/io5'
import AvatarImage from '../../components/AvatarImage'

import { useConfirmPopup } from '../../hooks/useConfirmPopup'
import { selectUserTabMe } from '../../selectors'
import { ConfirmContentOptions, FLASH_DURATION_MS } from '../../lib/AppConst'
import { DefaultServer } from '../../lib/MessengerConst'
import Logger from '../../lib/Logger'
import { setConfirmPopup, setFlashNoticeMessage } from '../../store/slices/CommonSlice'
import { setNickname } from '../../store/slices/UserSlice'
import { AccountDel, ContactAdd } from '../../store/sagas/messenger.actions'

const AvatarCropper = lazy(() => import('../../components/AvatarCropper'))

export default function ProfileSection() {
  const { t } = useTranslation()
  const [displayNickname, setDisplayNickname] = useState('')
  const [imageSrc, setImageSrc] = useState(null)
  const blobUrlRef = useRef(null)
  const [imageTimestamp, setImageTimestamp] = useState(Date.now())
  const [showRemoveButton, setShowRemoveButton] = useState(false)

  const dispatch = useDispatch()
  const { Address, Nickname, Seed, AccountList } = useSelector(selectUserTabMe)
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
    setDisplayNickname(Nickname)
  }, [Nickname])

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
        Message: t('setting.remove_account_confirm'),
        Result: false
      })
    )
  }

  const confirmCopySeed = () => {
    dispatch(
      setConfirmPopup({
        Content: ConfirmContentOptions.CopySeed,
        Message: t('setting.copy_seed_confirm'),
        Result: false
      })
    )
  }

  return (
    <>
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
      <div className="w-full max-w-full min-w-0 rounded-xl card p-6 flex flex-col gap-4 mt-4">
        <div className="flex items-center gap-2 mb-2">
          <IoPersonOutline className="text-xl text-primary dark:text-dark-primary" />
          <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">{t('setting.tab_me')}</h3>
        </div>

        {/* Avatar */}
        <div className="flex items-center justify-between gap-4 py-2 border-b border-primary/10 dark:border-primary/20 last:border-b-0">
          <div className="flex flex-col">
            <span className="text-text-primary dark:text-dark-text-primary font-medium">{t('setting.avatar')}</span>
            <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
              {t('setting.avatar_desc')}
            </span>
          </div>
          {Address && (
            <AvatarImage
              address={Address}
              timestamp={imageTimestamp}
              onClick={() => browseAvatarSource()}
              classNames={'avatar'}
            />
          )}
        </div>

        {/* Nickname */}
        <div className="flex items-center justify-between gap-4 py-2 border-b border-primary/10 dark:border-primary/20 last:border-b-0">
          <div className="flex flex-col">
            <span className="text-text-primary dark:text-dark-text-primary font-medium">{t('setting.nickname')}</span>
            <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
              {t('setting.nickname_desc')}
            </span>
          </div>
          <input
            type="text"
            value={displayNickname}
            autoComplete={'off'}
            placeholder={'Alice'}
            onChange={(e) => updateNickname(e.target.value)}
            className="w-48 px-3 py-2 border rounded-lg shadow-sm appearance-none focus:outline-none input-hover border-primary/30 dark:border-primary/40 input-color"
          />
        </div>

        {/* QR Code */}
        {Address && (
          <div className="flex items-center justify-between gap-4 py-2 border-b border-primary/10 dark:border-primary/20 last:border-b-0">
            <div className="flex flex-col">
              <span className="text-text-primary dark:text-dark-text-primary font-medium">{t('setting.qr_code')}</span>
              <span className="text-sm text-text-secondary dark:text-dark-text-secondary">{t('setting.qr_hint')}</span>
            </div>
            <button onClick={() => setShowQrCode(true)} className="btn-sm btn-gold">
              {t('setting.qr_code')}
            </button>
          </div>
        )}

        {/* Copy Seed */}
        <div className="flex items-center justify-between gap-4 py-2 border-b border-primary/10 dark:border-primary/20 last:border-b-0">
          <div className="flex flex-col">
            <span className="text-text-primary dark:text-dark-text-primary font-medium">{t('auth.copy_seed')}</span>
            <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
              {t('setting.copy_seed_desc')}
            </span>
          </div>
          <button onClick={() => confirmCopySeed()} className="btn-sm btn-yellow">
            {t('auth.copy_seed')}
          </button>
        </div>

        {/* Remove Account */}
        {showRemoveButton && (
          <div className="flex items-center justify-between gap-4 py-2 border-b border-primary/10 dark:border-primary/20 last:border-b-0">
            <div className="flex flex-col">
              <span className="text-text-primary dark:text-dark-text-primary font-medium">
                {t('auth.remove_account')}
              </span>
              <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                {t('setting.remove_account_desc')}
              </span>
            </div>
            <button onClick={() => confirmDelAccount()} className="btn-sm btn-danger">
              {t('auth.remove_account')}
            </button>
          </div>
        )}

        {imageSrc && (
          <Suspense fallback={null}>
            <AvatarCropper address={Address} imageSrc={imageSrc} onClose={() => closeAvatarCropper()} />
          </Suspense>
        )}
      </div>
    </>
  )
}
