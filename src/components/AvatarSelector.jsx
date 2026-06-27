import { useState, useEffect, useCallback } from 'react'
import AvatarImage from './AvatarImage'

const AvatarSelector = ({ avatars = [], defaultIndex = 0, onSelect, disableKeyboard = false }) => {
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex)

  // Sync when external index changes (e.g. keyboard-driven from password input)
  useEffect(() => {
    if (selectedIndex !== defaultIndex) {
      setSelectedIndex(defaultIndex)
      onSelect?.(avatars[defaultIndex]?.value)
    }
  }, [defaultIndex])

  const handleAvatarClick = useCallback((index) => {
    setSelectedIndex(index)
    onSelect?.(avatars[index].value)
  }, [avatars, onSelect])

  // Keyboard navigation — delegated to OpenPage when disableKeyboard=true
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (disableKeyboard || avatars.length <= 1) return

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
  }, [selectedIndex, disableKeyboard, avatars.length, onSelect])

  const getItemStyle = useCallback((index) => {
    if (avatars.length === 0) return {}

    let diff = index - selectedIndex
    // Shortest path in circular carousel
    if (avatars.length > 1) {
      const halfLen = avatars.length / 2
      if (diff > halfLen) diff -= avatars.length
      if (diff < -halfLen) diff += avatars.length
    }

    // Adaptive offset: smaller for large avatar counts so all stay visible
    const isLargeSet = avatars.length > 8
    const itemGap = isLargeSet ? 30 : 65
    const xOffset = diff * itemGap

    // 3D perspective effect — toned down for large sets
    let angle = 0
    if (diff !== 0) {
      const t = Math.min(Math.abs(diff), 3)
      angle = (isLargeSet ? 12 : 20 + t * 10) * Math.sign(diff)
    }

    const scale = isLargeSet
      ? Math.max(0.7, 1 - Math.abs(diff) * 0.06)
      : Math.max(0.6, 1 - Math.abs(diff) * 0.12)
    const opacity = isLargeSet
      ? Math.max(0.5, 1 - Math.abs(diff) * 0.08)
      : Math.max(0.4, 1 - Math.abs(diff) * 0.15)
    const zIndex = 50 + (10 - Math.abs(diff))

    return {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: `translateX(${xOffset}px) translateY(-50%) translateX(-50%) rotateY(${angle}deg) scale(${scale})`,
      opacity,
      zIndex,
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      transformOrigin: 'center center',
      transformStyle: 'preserve-3d',
    }
  }, [selectedIndex, avatars.length])

  return (
    <div className="w-full py-20 overflow-hidden">
      <div className="relative flex items-center justify-center w-full perspective-3d">
        {avatars.map((id, index) => {
          const style = getItemStyle(index)
          const isSelected = index === selectedIndex

          return (
            <div
              key={id.value}
              style={style}
              onClick={() => handleAvatarClick(index)}
              className="cursor-pointer"
            >
              <AvatarImage
                address={id.value}
                classNames={`avatar w-24 h-24 object-cover rounded-xl shadow-lg transition-all duration-300 ${isSelected ? 'ring-4 ring-status-success dark:ring-status-success-dark shadow-gold' : ''}`}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AvatarSelector
