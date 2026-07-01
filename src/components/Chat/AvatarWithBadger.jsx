import React from 'react'
import { GrGroup } from 'react-icons/gr'
import { SessionType } from '../../lib/AppConst'
import AvatarImage from '../AvatarImage'
import Badge from '../Badge'

const AvatarWithBadge = ({ new_msg_count = 0, session_type, address, size = "w-12 h-12" }) => {
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

      {new_msg_count > 0 && <Badge count={new_msg_count} />}
    </div>
  )
}

export default React.memo(AvatarWithBadge)