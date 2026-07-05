import React from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { selectUserAddress } from '../../selectors'
import { MessageObjectType } from '../../lib/MessengerConst'
import { setDisplayJson } from '../../store/slices/CommonSlice'
import AvatarImage from '../AvatarImage'
import BulletinLink from '../Bulletin/BulletinLink'
import TextTimestamp from '../TextTimestamp'
import ChatFileLink from './ChatFileLink'

/**
 * Unified message card for both private and group chat messages.
 * @param {object} props
 * @param {object} props.message - Message object
 * @param {'private'|'group'} props.mode - Chat mode to determine field names
 */
const MessageCard = ({ message, mode = 'private' }) => {

  const dispatch = useDispatch()
  const Address = useSelector(selectUserAddress)

  // Field names differ between private and group messages
  const senderField = mode === 'group' ? 'address' : 'sour'
  const isSelf = message[senderField] === Address
  const fileObjectType = mode === 'group'
    ? MessageObjectType.GroupChatFile
    : MessageObjectType.PrivateChatFile

  return (
    <div className={`flex ${isSelf ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'} animate-slideUp`}>
      <AvatarImage address={message[senderField]} classNames={'avatar-sm'} />

      <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} max-w-[75%]`}>
        <div className={`flex flex-row justify-between`}>
          <button className={`rounded-full px-2 py-0.5 border border-primary/30 dark:border-primary/40 shrink-0 cursor-pointer hover:bg-primary/10 dark:hover:bg-primary/20 hover:border-primary/60 dark:hover:border-primary/50 hover:text-text-primary dark:hover:text-dark-text-primary transition-colors focus:outline-none`} onClick={() => { dispatch(setDisplayJson({ json: message.json, isExpand: true })) }} aria-label={`View message #${message.sequence} details`}>
            <span className={`text-xs text-text-secondary/60 dark:text-dark-text-secondary/60 text-left`}>
              #{message.sequence}
            </span>
          </button>
          <TextTimestamp timestamp={message.signed_at} textSize={'text-xs'} />
        </div>

        <div className={`${isSelf ? 'rounded-tr-none' : 'rounded-tl-none'} max-w-full`}>
          {
            message.is_object === false &&
            <pre className="chat-content-pop whitespace-pre-wrap break-words text-base leading-relaxed m-0">
              {message.content}
            </pre>
          }
          {
            message.is_object === true && message.content.ObjectType === MessageObjectType.Bulletin &&
            <BulletinLink address={message.content.Address} sequence={message.content.Sequence} hash={message.content.Hash} sour_address={message[senderField]} />
          }
          {
            message.is_object === true && message.content.ObjectType === fileObjectType &&
            <ChatFileLink address={message[senderField]} name={message.content.Name} ext={message.content.Ext} size={message.content.Size} hash={message.content.Hash} />
          }
        </div>
      </div>
    </div >
  )
}

export default React.memo(MessageCard)
