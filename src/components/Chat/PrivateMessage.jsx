import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import TextTimestamp from '../TextTimestamp'
import { setDisplayJson } from '../../store/slices/CommonSlice'
import { MessageObjectType } from '../../lib/MessengerConst'
import BulletinLink from '../Bulletin/BulletinLink'
import ChatFileLink from './ChatFileLink'
import AvatarImage from '../AvatarImage'

const PrivateMessage = ({ message }) => {

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { Address } = useSelector(state => state.User)

  const isSlef = message.sour === Address

  return (
    <div className={`flex ${isSlef ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'}`}>
      <AvatarImage address={message.sour} timestamp={Date.now()} style={'avatar-sm'} />

      <div className={`flex flex-col ${isSlef ? 'items-end' : 'items-start'} max-w-[75%]`}>
        <div className={`flex flex-row justify-between`}>
          <div className={`rounded-full px-1 border border-gray-400 shrink-0`} onClick={() => { dispatch(setDisplayJson({ json: message.json, isExpand: true })) }}>
            <span className={`text-xs text-gray-500 dark:text-slate-200 text-left`}>
              #{message.sequence}
            </span>
          </div>
          <TextTimestamp timestamp={message.signed_at} textSize={'text-xs'} />
        </div>

        <div className={`${isSlef ? 'rounded-tr-none' : 'rounded-tl-none'} max-w-full`}>
          {
            message.is_object === false &&
            <pre className="chat-content-pop whitespace-pre-wrap break-words text-base leading-relaxed m-0">
              {message.content}
            </pre>
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