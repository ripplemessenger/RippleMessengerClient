import { useState, useCallback, memo } from 'react'
import { useDispatch } from 'react-redux'
import { IoStar, IoStarOutline, IoCopyOutline, IoArrowRedoOutline, IoInformationCircleOutline } from "react-icons/io5"
import { AiOutlineLink } from "react-icons/ai"
import { MdPostAdd } from "react-icons/md"
import { FLASH_DURATION_MS } from '../../lib/AppConst'
import { MessageObjectType } from '../../lib/MessengerConst'
import { useClipboard } from '../../hooks/useClipboard'
import { setDisplayJson, setFlashNoticeMessage } from '../../store/slices/CommonSlice'
import { BulletinMarkToggle, BulletinQuote, BulletinReply, ShowForwardBulletin } from '../../store/sagas/messenger.actions'

const BulletinTools = ({ address, sequence, hash, content, json, is_marked = false }) => {

  const [displayMark, setDisplayMark] = useState(is_marked)

  const dispatch = useDispatch()

  const copyText = useClipboard(useCallback((msg) => dispatch(setFlashNoticeMessage({ message: msg, duration: FLASH_DURATION_MS })), [dispatch]))

  const toggleMarkDisplay = () => {
    setDisplayMark(!displayMark)
  }

  return (
    <div className={`flex flex-row gap-1`}>
      <button className="icon-action-btn" onClick={() => { dispatch(BulletinMarkToggle({ hash })); toggleMarkDisplay() }} aria-label={displayMark ? "Unmark bulletin" : "Mark bulletin"}>
        {displayMark ? <IoStar className="icon-sm" /> : <IoStarOutline className="icon-sm" />}
      </button>
      <button className="icon-action-btn" onClick={() => dispatch(BulletinReply({ Address: address, Sequence: sequence, Hash: hash }))} aria-label="Reply">
        <MdPostAdd className="icon-sm" />
      </button>
      <button className="icon-action-btn" onClick={() => dispatch(BulletinQuote({ Address: address, Sequence: sequence, Hash: hash }))} aria-label="Quote">
        <AiOutlineLink className="icon-sm" />
      </button>
      <button className="icon-action-btn" onClick={() => dispatch(ShowForwardBulletin({ ObjectType: MessageObjectType.Bulletin, Address: address, Sequence: sequence, Hash: hash }))} aria-label="Forward">
        <IoArrowRedoOutline className="icon-sm" />
      </button>
      <button className="icon-action-btn" onClick={() => copyText(content)} aria-label="Copy content">
        <IoCopyOutline className="icon-sm" />
      </button>
      <button className="icon-action-btn" onClick={() => dispatch(setDisplayJson({ json, isExpand: true }))} aria-label="View details">
        <IoInformationCircleOutline className="icon-sm" />
      </button>
    </div>
  )
}

export default memo(BulletinTools)
