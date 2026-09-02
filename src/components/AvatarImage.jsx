import { useEffect, memo } from 'react'
import { useDispatch } from 'react-redux'
import { CheckAvatar } from '../store/sagas/messenger.actions'
import { AvatarDir } from '../lib/AppConst'
import { useAppBaseDir } from '../hooks/useAppBaseDir'
import { useFileBlobUrl } from '../hooks/useFileBlobUrl'

// 8-color palette (same as App)
const COLORS = [
  '#e6b420', // primary gold
  '#5b8dee', // blue
  '#e06c75', // red
  '#98c379', // green
  '#c678dd', // purple
  '#d19a66', // orange
  '#61afef', // light blue
  '#be5046' // dark red
]

function addressToColor(address) {
  let hash = 0
  for (let i = 0; i < address.length; i++) {
    hash = ((hash << 5) - hash + address.charCodeAt(i)) | 0
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

// Get 4-character identifier: chars[1..2] + last 2 chars (same as App)
function getInitials(address) {
  if (address && address.length >= 4) {
    return address[1] + address[2] + address[address.length - 2] + address[address.length - 1]
  }
  if (address && address.length >= 2) return address.slice(0, 2)
  return '?'
}

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

  // Fallback: colored square with initials (same as App)
  const bgColor = address ? addressToColor(address) : '#a89f85'
  const initials = address ? getInitials(address) : '?'

  // Font size proportional to avatar size (same ratio as App: size * 0.38)
  const fontSize = classNames?.includes('avatar-xs')
    ? 'text-[10px]'
    : classNames?.includes('avatar-sm')
      ? 'text-lg'
      : classNames?.includes('avatar')
        ? 'text-4xl'
        : 'text-xs'

  return (
    <div
      onClick={onClick}
      className={`flex-shrink-0 transition-transform duration-200 ease-in-out ${onClick ? 'cursor-pointer avatar-hover' : ''}`}
    >
      {avatarImage ? (
        <img
          src={avatarImage}
          alt={altText}
          className={`${classNames} ${onClick ? 'transition-all duration-200 ease-in-out' : ''}`}
        />
      ) : (
        <div
          className={`${classNames} flex items-center justify-center font-bold`}
          style={{ backgroundColor: `${bgColor}30`, color: bgColor }}
          aria-label={altText}
        >
          <span className={`${fontSize} leading-tight text-center`}>
            {initials.slice(0, 2)}
            <br />
            {initials.slice(2, 4)}
          </span>
        </div>
      )}
    </div>
  )
})

export default AvatarImage
