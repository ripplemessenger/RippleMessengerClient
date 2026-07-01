import React from 'react'

/**
 * Badge component for displaying numeric counts with a 9999+ cap.
 * @param {Object} Props
 * @param {number} Props.count - Number to display
 */
const Badge = ({ count = 0 }) => {
  if (count <= 0) return null

  const badgeText = count > 9999 ? '9999+' : String(count)

  const badgeWidthClass =
    badgeText.length === 1 ? 'min-w-5' :
      badgeText.length === 2 ? 'min-w-6' :
        badgeText.length === 3 ? 'min-w-7' :
          'min-w-8'

  return (
    <div
      className={`
        absolute -bottom-1 -right-1
        flex items-center justify-center
        bg-primary text-white text-xs font-bold
        rounded-full border-2 border-surface dark:border-dark-surface
        shadow-gold
        ${badgeWidthClass}
        h-5 px-1.5
        leading-none
      `}
    >
      {badgeText}
    </div>
  )
}

export default React.memo(Badge)
