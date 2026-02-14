import AvatarName from '../AvatarName'
import TextTimestamp from '../TextTimestamp'
import SessionName from './SessionName'
import { SessionType } from '../../lib/AppConst'
import AvatarWithBadger from './AvatarWithBadger'

const ListSession = ({ session, onClick, textSize = 'text-base' }) => {

  return (
    <div className={`${textSize}`}>
      {
        session.type === SessionType.Private &&
        <div className={`flex flex-row mx-5px mt-5px`} onClick={onClick}>
          <AvatarWithBadger session_type={session.type} address={session.address} new_msg_count={session.new_msg_count} timestamp={Date.now()} />
          <div className={`flex flex-col justify-between`}>
            <div className={`flex flex-col justify-between px-1`}>
              <AvatarName address={session.address} />
              <TextTimestamp timestamp={session.updated_at} textSize={'text-xs'} />
            </div>
          </div>
        </div>
      }
      {
        session.type === SessionType.Group &&
        <div className={`flex flex-row mx-5px mt-5px`} onClick={onClick}>
          <AvatarWithBadger session_type={session.type} new_msg_count={session.new_msg_count} timestamp={Date.now()} />
          <div className={`flex flex-col justify-between`}>
            <div className={`flex flex-col justify-between px-1`}>
              <SessionName name={session.name} />
              <TextTimestamp timestamp={session.updated_at} textSize={'text-xs'} />
            </div>
          </div>
        </div>
      }
    </div>
  )
}

export default ListSession