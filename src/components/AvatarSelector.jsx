import { useState, useEffect, useRef } from 'react'
import AvatarImage from './AvatarImage'

const AvatarSelector = ({ avatars = [], defaultIndex = 0, onSelect }) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef(null)

  const BASE_AVATAR_WIDTH = 96
  const BASE_AVATAR_HEIGHT = 96
  const MIN_GAP = 50
  const MAX_GAP = 50
  const MIN_ANGLE = 20
  const MAX_ANGLE = 60
  const MAX_EFFECTIVE_DIFF = 3

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect()
        setContainerWidth(width)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const getAdaptiveParams = () => {
    if (containerWidth === 0 || avatars.length === 0) {
      return { avatarWidth: BASE_AVATAR_WIDTH, avatarHeight: BASE_AVATAR_HEIGHT, gap: MAX_GAP }
    }

    const avatarCount = avatars.length
    const gapCount = avatarCount - 1
    const safePadding = BASE_AVATAR_WIDTH
    const availableWidth = containerWidth - safePadding

    let totalWidth = BASE_AVATAR_WIDTH * avatarCount + MAX_GAP * gapCount
    if (totalWidth <= availableWidth) {
      return { avatarWidth: BASE_AVATAR_WIDTH, avatarHeight: BASE_AVATAR_HEIGHT, gap: MAX_GAP }
    }

    totalWidth = BASE_AVATAR_WIDTH * avatarCount + MIN_GAP * gapCount
    if (totalWidth <= availableWidth) {
      const availableGapSpace = availableWidth - BASE_AVATAR_WIDTH * avatarCount
      const gap = gapCount === 0 ? MAX_GAP : availableGapSpace / gapCount
      return { avatarWidth: BASE_AVATAR_WIDTH, avatarHeight: BASE_AVATAR_HEIGHT, gap }
    }

    const availableAvatarSpace = availableWidth - MIN_GAP * gapCount
    const scale = availableAvatarSpace / (BASE_AVATAR_WIDTH * avatarCount)
    const avatarWidth = BASE_AVATAR_WIDTH * scale
    const avatarHeight = BASE_AVATAR_HEIGHT * scale
    return { avatarWidth, avatarHeight, gap: MIN_GAP }
  }

  useEffect(() => {
    if (avatars.length > 0) {
      const safeIndex = Math.max(0, Math.min(defaultIndex, avatars.length - 1))
      setSelectedIndex(safeIndex)
    }
  }, [avatars, defaultIndex])

  const getTransformStyle = (index, params) => {
    if (avatars.length === 0) return {}

    const { avatarWidth, gap } = params
    const itemTotalWidth = avatarWidth + gap

    let diff = index - selectedIndex
    if (avatars.length > 1) {
      const halfLen = avatars.length / 2
      if (diff > halfLen) diff -= avatars.length
      if (diff < -halfLen) diff += avatars.length
    }

    const x = diff * itemTotalWidth

    let angle = 0
    if (diff !== 0) {
      const normalizedDiff = Math.min(Math.abs(diff), MAX_EFFECTIVE_DIFF)
      const angleRange = MAX_ANGLE - MIN_ANGLE
      angle = (MIN_ANGLE + (normalizedDiff / MAX_EFFECTIVE_DIFF) * angleRange) * Math.sign(diff)
    }

    const scale = Math.max(0.7, 1 - Math.abs(diff) * 0.1)

    const opacity = Math.max(0.5, 1 - Math.abs(diff) * 0.15)

    const zIndex = 50 + (10 - Math.abs(diff))

    return {
      position: 'absolute',
      left: '50%',
      top: '50%',
      marginLeft: `-${avatarWidth / 2}px`,
      marginTop: `-${BASE_AVATAR_HEIGHT / 2}px`,
      transformOrigin: 'center center',
      transform: `translateX(${x}px) rotateY(${angle}deg) scale(${scale})`,
      opacity,
      zIndex,
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      transformStyle: 'preserve-3d',
      backfaceVisibility: 'hidden',
    }
  }

  const handleAvatarClick = (index) => {
    if (avatars.length <= 1) {
      onSelect?.(avatars[index].value)
      return
    }
    setSelectedIndex(index)
    onSelect?.(avatars[index].value)
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (avatars.length <= 1) return

      let newIndex
      if (e.key === 'ArrowLeft') {
        newIndex = (selectedIndex - 1 + avatars.length) % avatars.length
      } else if (e.key === 'ArrowRight') {
        newIndex = (selectedIndex + 1) % avatars.length
      } else {
        return
      }

      setSelectedIndex(newIndex)
      onSelect?.(avatars[newIndex].value)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, avatars.length, onSelect])

  const adaptiveParams = getAdaptiveParams()
  return (
    <div className="w-full py-20 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <div
          ref={containerRef}
          className="relative flex items-center justify-center w-full"
          style={{ perspective: '1500px', perspectiveOrigin: 'center center', }}
        >
          {avatars.map((id, index) => {
            const isSelected = index === selectedIndex
            const style = getTransformStyle(index, adaptiveParams)

            return (
              <div
                key={id.value}
                style={style}
                onClick={() => handleAvatarClick(index)}
                className="cursor-pointer"
              >
                <AvatarImage address={id.value} timestamp={Date.now()} style={`avatar object-cover rounded-xl shadow-lg transition-all duration-300 ${isSelected ? 'ring-4 ring-green-400 shadow-green-500/50' : ''}`} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AvatarSelector