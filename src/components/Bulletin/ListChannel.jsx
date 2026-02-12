import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import TextTimestamp from '../TextTimestamp'
import { GrChannel } from "react-icons/gr"
import ChannelName from './ChannelName'

const ListChannel = ({ channel, textSize = 'text-base' }) => {

  const dispatch = useDispatch()
  const navigate = useNavigate()

  return (
    <div className={`${textSize}`}>
      <div className={`flex flex-row mx-5px mt-5px`} onClick={() => { dispatch({ type: 'LoadCurrentChannel', payload: channel }) }}>
        <GrChannel className="channel-icon" />
        <div className={`flex flex-col justify-between`}>
          <div className={`flex flex-row justify-between px-1`}>
            <ChannelName name={channel.name} />
            <TextTimestamp timestamp={channel.created_at} textSize={'text-xs'} />
          </div>
          <div className={`flex flex-row justify-between`}>
            {channel.recent_msg}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ListChannel