import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { RxAvatar } from "react-icons/rx"
import { readFile, exists, BaseDirectory } from '@tauri-apps/plugin-fs'
import { AvatarDir } from '../lib/AppConst'
import { useAppBaseDir } from '../hooks/useAppBaseDir'

const AvatarImage = ({ address, onClick, classNames }) => {
  const AppBaseDir = useAppBaseDir()
  const [avatarImage, setAvatarImage] = useState(null)

  const dispatch = useDispatch()

  async function setAvatar() {
    const is_avater_exist = await exists(`${AvatarDir}/${address}.png`, {
      baseDir: BaseDirectory.Resource,
    })
    if (is_avater_exist) {
      const fileName = `/${AvatarDir}/${address}.png`
      const avatarPath = AppBaseDir + fileName
      const bytes = await readFile(avatarPath)
      const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' })
      const url = URL.createObjectURL(blob)
      setAvatarImage(url)
      return url
    }
    return null
  }

  useEffect(() => {
    let objectUrl = null
    setAvatar().then(url => { objectUrl = url })

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [address])

  useEffect(() => {
    if (address !== undefined) {
      dispatch({
        type: 'CheckAvatar',
        payload: { address: address }
      })
    }
  }, [address, dispatch])

  return (
    <div onClick={onClick} className={`flex-shrink-0 transition-transform duration-200 ease-in-out ${onClick ? 'cursor-pointer avatar-hover' : ''}`}>
      {
        avatarImage ?
          <img
            src={avatarImage}
            alt={address}
            className={`${classNames} ${onClick ? 'transition-all duration-200 ease-in-out' : ''}`}
          />
          :
          <RxAvatar className={`${classNames} text-text-primary/70 dark:text-dark-text-primary/60 ${onClick ? 'transition-all duration-200 ease-in-out' : ''}`} />
      }
    </div>
  )
}

export default AvatarImage
