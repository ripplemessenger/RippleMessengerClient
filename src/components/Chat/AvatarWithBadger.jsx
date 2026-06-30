import React from 'react'
import { GrGroup } from 'react-icons/gr'
import { SessionType } from '../../lib/AppConst'
import AvatarImage from '../AvatarImage'

const AvatarWithBadge = ({ new_msg_count = 0, session_type, address, size = "w-12 h-12" }) => {
  const showBadge = new_msg_count > 0
  const badgeText = new_msg_count > 9999 ? "9999+" : String(new_msg_count)

  function getBadgeWidth(length) {
    if (length === 1) return 'min-w-5'
    if (length === 2) return 'min-w-6'
    if (length === 3) return 'min-w-7'
    return 'min-w-8'
  }

  const badgeWidth = getBadgeWidth(badgeText.length)

  return (
    <div className="relative inline-block">
      <div className={`overflow-hidden border border-white shadow ${size}`}>
        {
          session_type === SessionType.Private &&
          <AvatarImage address={address} classNames={'avatar-sm'} />
        }
         {
          session_type === SessionType.Group &&
          <GrGroup className="session-icon text-text-primary/70 dark:text-dark-text-primary/60" />
        }
      </div>

      {showBadge && (
        <div
          className={`
            absolute -bottom-1 -right-1
            flex items-center justify-center
            bg-primary hover:bg-primary-dark text-white text-xs font-bold
            rounded-full border-2 border-surface dark:border-dark-surface
            shadow-gold
            ${badgeWidth}
            h-5 px-1.5
            leading-none
          `}
        >
          {badgeText}
        </div>
      )}
    </div>
  )
}

export default React.memo(AvatarWithBadge)