import { useEffect, memo } from 'react'
import { useDispatch } from 'react-redux'
import { RxAvatar } from 'react-icons/rx'
import { CheckAvatar } from '../store/sagas/messenger.actions'
import { AvatarDir } from '../lib/AppConst'
import { useAppBaseDir } from '../hooks/useAppBaseDir'
import { useFileBlobUrl } from '../hooks/useFileBlobUrl'

const AvatarImage = memo(({ address, nickname, onClick, classNames }) => {
  const AppBaseDir = useAppBaseDir()
  const dispatch = useDispatch()

  const avatarPath = address ? `${AppBaseDir}/${AvatarDir}/${address}.png` : null
  const avatarImage = useFileBlobUrl(avatarPath, 'image/png')
  const altText = nickname || 'avatar'

  useEffect(() => {
    if (address !== undefined) {
      dispatch(CheckAvatar({ address }))
    }
  }, [address, dispatch])

  return (
    <div onClick={onClick} className={`flex-shrink-0 transition-transform duration-200 ease-in-out ${onClick ? 'cursor-pointer avatar-hover' : ''}`}>
      {avatarImage ? (
        <img
          src={avatarImage}
          alt={altText}
          className={`${classNames} ${onClick ? 'transition-all duration-200 ease-in-out' : ''}`}
        />
      ) : (
        <RxAvatar className={`${classNames} text-text-primary/70 dark:text-dark-text-primary/60 ${onClick ? 'transition-all duration-200 ease-in-out' : ''}`} aria-label={altText} />
      )}
    </div>
  )
})

export default AvatarImage
