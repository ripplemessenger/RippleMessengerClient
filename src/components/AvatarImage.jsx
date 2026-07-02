import { useEffect, memo } from 'react'
import { useDispatch } from 'react-redux'
import { RxAvatar } from 'react-icons/rx'
import { AvatarDir } from '../lib/AppConst'
import { useAppBaseDir } from '../hooks/useAppBaseDir'
import { useFileBlobUrl } from '../hooks/useFileBlobUrl'

const AvatarImage = memo(({ address, onClick, classNames }) => {
  const AppBaseDir = useAppBaseDir()
  const dispatch = useDispatch()

  const avatarPath = address ? `${AppBaseDir}/${AvatarDir}/${address}.png` : null
  const avatarImage = useFileBlobUrl(avatarPath, 'image/png')

  useEffect(() => {
    if (address !== undefined) {
      dispatch({
        type: 'CheckAvatar',
        payload: { address }
      })
    }
  }, [address, dispatch])

  return (
    <div onClick={onClick} className={`flex-shrink-0 transition-transform duration-200 ease-in-out ${onClick ? 'cursor-pointer avatar-hover' : ''}`}>
      {avatarImage ? (
        <img
          src={avatarImage}
          alt={address}
          className={`${classNames} ${onClick ? 'transition-all duration-200 ease-in-out' : ''}`}
        />
      ) : (
        <RxAvatar className={`${classNames} text-text-primary/70 dark:text-dark-text-primary/60 ${onClick ? 'transition-all duration-200 ease-in-out' : ''}`} />
      )}
    </div>
  )
})

export default AvatarImage
