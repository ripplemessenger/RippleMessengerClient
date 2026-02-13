import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import TextTimestamp from '../TextTimestamp'
import { setDisplayJson } from '../../store/slices/UserSlice'
import { MessageObjectType } from '../../lib/MessengerConst'
import BulletinLink from '../Bulletin/BulletinLink'
import ChatFileLink from './ChatFileLink'
import AvatarImage from '../AvatarImage'

const PrivateMessage = ({ message }) => {

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { Address } = useSelector(state => state.User)
  // console.log(message)
  return (
    <div className={`flex ${message.sour !== Address ? 'mr-auto flex-row' : 'ml-auto flex-row-reverse'}`}>
      <AvatarImage address={message.sour} timestamp={Date.now()} style={'avatar-sm'} />

      <div className={`flex flex-col ${message.sour !== Address ? 'items-start' : 'items-end'}`}>
        <div className={`flex flex-row justify-between`}>
          <div className={`rounded-full px-1 border border-gray-400 shrink-0`} onClick={() => { dispatch(setDisplayJson({ json: message.json, isExpand: true })) }}>
            <span className={`text-xs text-gray-500 dark:text-slate-200 text-left`}>
              #{message.sequence}
            </span>
          </div>
          <TextTimestamp timestamp={message.signed_at} textSize={'text-xs'} />
        </div>

        <div className={`${message.sour !== Address ? 'mr-auto' : 'ml-auto'}`}>
          {
            message.is_object === false &&
            <span className={`w-full text-base text-slate-800 dark:text-slate-200`} >
              {message.content}
            </span>
          }
          {
            message.is_object === true && message.content.ObjectType === MessageObjectType.Bulletin &&
            <BulletinLink address={message.content.Address} sequence={message.content.Sequence} hash={message.content.Hash} sour_address={message.sour} timestamp={Date.now()} />
          }
          {
            message.is_object === true && message.content.ObjectType === MessageObjectType.PrivateChatFile &&
            <ChatFileLink address={message.sour} name={message.content.Name} ext={message.content.Ext} size={message.content.Size} hash={message.content.Hash} timestamp={Date.now()} />
          }
        </div>
      </div>
    </div >
  )
}

export default PrivateMessage