import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { open } from '@tauri-apps/plugin-dialog'
import AvatarImage from '../../components/AvatarImage'
import TextInput from '../../components/Form/TextInput'
import { readFile } from '@tauri-apps/plugin-fs'

import { useConfirmPopup } from '../../hooks/useConfirmPopup'
import { selectUserTabMe } from '../../selectors'
import { ConfirmContentOptions, FLASH_DURATION_MS, SettingPageTab } from '../../lib/AppConst'
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
