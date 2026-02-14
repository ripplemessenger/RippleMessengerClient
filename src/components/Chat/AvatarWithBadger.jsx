import { GrGroup } from 'react-icons/gr'
import { SessionType } from '../../lib/AppConst'
import AvatarImage from '../AvatarImage'

const AvatarWithBadge = ({ new_msg_count = 0, session_type, address, size = "w-12 h-12" }) => {
  const showBadge = new_msg_count > 0
  const badgeText = new_msg_count > 9999 ? "9999+" : String(new_msg_count)

  const badgeWidthClass =
    badgeText.length === 1 ? "min-w-5" :
      badgeText.length === 2 ? "min-w-6" :
        badgeText.length === 3 ? "min-w-7" :
          "min-w-8"

  return (
    <div className="relative inline-block">
      <div className={`overflow-hidden border border-white shadow ${size}`}>
        {
          session_type === SessionType.Private &&
          <AvatarImage address={address} timestamp={Date.now()} style={'avatar-sm'} />
        }
         {
          session_type === SessionType.Group &&
          <GrGroup className="session-icon" />
        }
      </div>

      {showBadge && (
        <div
          className={`
            absolute -bottom-1 -right-1 
            flex items-center justify-center
            bg-red-500 text-white text-xs font-bold
            rounded-full border border-white
            shadow-sm
            ${badgeWidthClass}
            h-5
            leading-none
          `}
        >
          {badgeText}
        </div>
      )}
    </div>
  )
}

export default AvatarWithBadge