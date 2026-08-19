import React from 'react'
import { GrGroup } from 'react-icons/gr'
import { SessionType } from '../../lib/AppConst'
import AvatarImage from '../AvatarImage'
import Badge from '../Badge'

const AvatarWithBadge = ({ new_msg_count = 0, session_type, address, member, size = 'w-12 h-12' }) => {
  return (
    <div className="relative inline-block">
      <div className={`overflow-hidden border border-white shadow ${size}`}>
        {session_type === SessionType.Private && <AvatarImage address={address} classNames={'avatar-sm'} />}
        {session_type === SessionType.Group &&
          (member && member.length > 0 ? (
            <GroupAvatar member={member} size={size} />
          ) : (
            <GrGroup className="session-icon text-text-primary/70 dark:text-dark-text-primary/60" />
          ))}
      </div>

      {new_msg_count > 0 && <Badge count={new_msg_count} />}
    </div>
  )
}

const GroupAvatar = ({ member, size }) => {
  // Show up to 4 member avatars in a 2x2 grid
  const displayMembers = member.slice(0, 4)
  const count = displayMembers.length

  if (count === 0) {
    return <GrGroup className="session-icon text-text-primary/70 dark:text-dark-text-primary/60" />
  }

  // Calculate grid layout based on member count
  const positions = [
    { top: '0', left: '0', w: '50%', h: '50%' },
    { top: '0', right: '0', w: '50%', h: '50%' },
    { bottom: '0', left: '0', w: '50%', h: '50%' },
    { bottom: '0', right: '0', w: '50%', h: '50%' }
  ]

  return (
    <div className={`relative ${size}`}>
      {displayMembers.map((addr, i) => (
        <div
          key={addr}
          className="absolute overflow-hidden"
          style={{
            top: positions[i].top,
            left: positions[i].left,
            right: positions[i].right,
            bottom: positions[i].bottom,
            width: positions[i].w,
            height: positions[i].h
          }}
        >
          <AvatarImage address={addr} classNames={'w-full h-full object-cover'} onClick={() => {}} />
        </div>
      ))}
    </div>
  )
}

export default React.memo(AvatarWithBadge)
