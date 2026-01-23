import { convertFileSrc } from '@tauri-apps/api/core'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { RxAvatar } from "react-icons/rx"
import { exists, BaseDirectory } from '@tauri-apps/plugin-fs'
import * as path from '@tauri-apps/api/path'

const Avatar = ({ address, timestamp = Date.now(), onClick, style }) => {
  const [avatarImage, setAvatarImage] = useState(null)

  const dispatch = useDispatch()

  async function setAvatar() {
    const is_avater_exist = await exists(`avatar/${address}.png`, {
      baseDir: BaseDirectory.AppLocalData,
    })
    if (is_avater_exist) {
      const fileName = `/Avatar/${address}.png`
      const avatarPath = await path.join(await path.appCacheDir() + fileName)
      let fileSrc = convertFileSrc(avatarPath) + `?t=${timestamp}`
      setAvatarImage(fileSrc)
    }

    dispatch({
      type: 'CheckAvatar',
      payload: { address: address }
    })
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

export default Avatar