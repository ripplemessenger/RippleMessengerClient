import { convertFileSrc } from '@tauri-apps/api/core'
import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RxAvatar } from "react-icons/rx"
import { readFile, exists, BaseDirectory } from '@tauri-apps/plugin-fs'
import * as path from '@tauri-apps/api/path'

const AvatarImage = ({ address, timestamp = Date.now(), onClick, style }) => {
  const { AppBaseDir } = useSelector(state => state.Common)
  const [avatarImage, setAvatarImage] = useState(null)

  const dispatch = useDispatch()

  async function setAvatar() {
    const is_avater_exist = await exists(`avatar/${address}.png`, {
      baseDir: BaseDirectory.Resource,
    })
    if (is_avater_exist) {
      const fileName = `/avatar/${address}.png`
      const avatarPath = AppBaseDir + fileName
      const bytes = await readFile(avatarPath)
      const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' })
      const url = URL.createObjectURL(blob)
      setAvatarImage(url)
    }

    if (address !== undefined) {
      dispatch({
        type: 'CheckAvatar',
        payload: { address: address }
      })
    }
  }

  useEffect(() => {
    setAvatar()
  }, [address, timestamp])

  return (
    <div key={timestamp} onClick={onClick} >
      {
        avatarImage ?
          <img
            src={avatarImage}
            alt={address}
            className={`${style}`}
          />
          :
          <RxAvatar className={`${style}`} />
      }
    </div>
  )
}

export default AvatarImage