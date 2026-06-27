import AvatarName from '../AvatarName'
import TextTimestamp from '../TextTimestamp'
import SessionName from './SessionName'
import { SessionType } from '../../lib/AppConst'
import AvatarWithBadger from './AvatarWithBadger'

const ListSession = ({ session, onClick, textSize = 'text-base' }) => {
  const rowClass = `flex flex-row mx-1.5 mt-2 cursor-pointer rounded-lg px-2 py-1 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors`

  return (
    <div className={`${textSize}`}>
      {session.type === SessionType.Private && (
        <div className={rowClass} onClick={onClick}>
          <AvatarWithBadger session_type={session.type} address={session.address} new_msg_count={session.new_msg_count} />
          <div className="flex flex-col justify-between px-1">
            <AvatarName address={session.address} />
            <TextTimestamp timestamp={session.updated_at} textSize={'text-xs'} />
          </div>
        </div>
      )}
      {session.type === SessionType.Group && (
        <div className={rowClass} onClick={onClick}>
          <AvatarWithBadger session_type={session.type} new_msg_count={session.new_msg_count} />
          <div className="flex flex-col justify-between px-1">
            <SessionName name={session.name} />
            <TextTimestamp timestamp={session.updated_at} textSize={'text-xs'} />
          </div>
        </div>
      )}
    </div>
  )
}

export default ListSession
