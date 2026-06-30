import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { open } from '@tauri-apps/plugin-dialog'
import { readFile } from '@tauri-apps/plugin-fs'

import AvatarCropper from '../../components/AvatarCropper'
import AvatarImage from '../../components/AvatarImage'
import TextInput from '../../components/Form/TextInput'
import { useConfirmPopup } from '../../hooks/useConfirmPopup'
import { ConfirmContentOptions, FLASH_DURATION_MS, SettingPageTab } from '../../lib/AppConst'
import { setConfirmPopup, setFlashNoticeMessage } from '../../store/slices/CommonSlice'
import { setNickname } from '../../store/slices/UserSlice'

export default function TabMe() {
  const [displayNickname, setDisplayNickname] = useState('')
  const [imageSrc, setImageSrc] = useState(null)
  const [imageTimestamp, setImageTimestamp] = useState(Date.now())
  const [showRemoveButton, setShowRemoveButton] = useState(false)

  const dispatch = useDispatch()
  const { Address, Nickname, Seed, AccountList, activeTabSetting } = useSelector(state => state.User)

  useEffect(() => {
    if (activeTabSetting === SettingPageTab.Me) {
      setDisplayNickname(Nickname)
    }
  }, [activeTabSetting])

  useEffect(() => {
    const account = AccountList.filter(a => a.address === Address)
    if (account.length > 0) {
      setShowRemoveButton(true)
    } else {
      setShowRemoveButton(false)
    }
  }, [AccountList])

  const browseAvatarSource = async () => {
    const file = await open({
      multiple: false,
      directory: false,
    })

    if (file) {
      const bytes = await readFile(file)
      const blob = new Blob([new Uint8Array(bytes)])
      const url = URL.createObjectURL(blob)
      setImageSrc(url)
    }
  }

  const updateNickname = (value) => {
    value = value.trim()
    setDisplayNickname(value)

    if (value !== '') {
      dispatch({ type: 'ContactAdd', payload: { address: Address, nickname: value } })
      dispatch(setNickname(value))
    }
  }

  const closeAvatarCropper = () => {
    setImageSrc(null)
    setImageTimestamp(Date.now())
  }

  const ConfirmPopup = useConfirmPopup()
  useEffect(() => {
    if (ConfirmPopup?.Content === ConfirmContentOptions.RemoveAccount && ConfirmPopup?.Result) {
      dispatch({
        type: 'AccountDel',
        payload: { address: Address }
      })
      dispatch(setConfirmPopup(null))
    }
  }, [ConfirmPopup])

  const confirmDelAccount = (address) => {
    dispatch(setConfirmPopup({ Content: ConfirmContentOptions.RemoveAccount, Result: false }))
  }

  const copySeed = async () => {
    await navigator.clipboard.writeText(Seed)
    dispatch(setFlashNoticeMessage({ message: 'copy seed success', duration: FLASH_DURATION_MS }))
  }

  return (
    <div className="tab-page">
      <div className="mx-auto flex flex-col mt-4 w-full max-w-full min-w-0">
        <div className="card-title">{SettingPageTab.Me}</div>
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
            label={'Nickname:'}
            value={displayNickname}
            autoComplete={"off"}
            placeholder={"Alice"}
            onChange={(e) => updateNickname(e.target.value)}
          />
          {imageSrc && (
            <AvatarCropper address={Address} imageSrc={imageSrc} onClose={() => closeAvatarCropper()} />
          )}
          <button onClick={() => copySeed()} className="btn-primary btn-yellow">Copy Seed</button>
          {showRemoveButton && (
            <button onClick={() => confirmDelAccount()} className="btn-primary btn-red">Remove Account</button>
          )}
        </div>
      </div>
    </div>
  )
}