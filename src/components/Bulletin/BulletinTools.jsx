import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { IoStar, IoStarOutline, IoCopyOutline, IoArrowRedoOutline, IoInformationCircleOutline } from "react-icons/io5"
import { AiOutlineLink } from "react-icons/ai"
import { MdPostAdd } from "react-icons/md"
import { FLASH_DURATION_MS } from '../../lib/AppConst'
import { MessageObjectType } from '../../lib/MessengerConst'
import { setDisplayJson, setFlashNoticeMessage } from '../../store/slices/CommonSlice'

const BulletinTools = ({ address, sequence, hash, content, json, is_marked = false }) => {

  const [displayMark, setDisplayMark] = useState(is_marked)

  const dispatch = useDispatch()

  const copyText = async (text) => {
    await navigator.clipboard.writeText(text)
    dispatch(setFlashNoticeMessage({ message: 'copy content success', duration: FLASH_DURATION_MS }))
  }

  const toggleMarkDisplay = async () => {
    setDisplayMark(!displayMark)
  }

  return (
    <div className={`flex flex-row gap-1`}>
      <button className="icon-action-btn" onClick={() => { dispatch({ type: 'BulletinMarkToggle', payload: { hash } }); toggleMarkDisplay() }} aria-label={displayMark ? "Unmark bulletin" : "Mark bulletin"}>
        {displayMark ? <IoStar className="icon-sm" /> : <IoStarOutline className="icon-sm" />}
      </button>
      <button className="icon-action-btn" onClick={() => dispatch({ type: 'BulletinReply', payload: { Address: address, Sequence: sequence, Hash: hash } })} aria-label="Reply">
        <MdPostAdd className="icon-sm" />
      </button>
      <button className="icon-action-btn" onClick={() => dispatch({ type: 'BulletinQuote', payload: { Address: address, Sequence: sequence, Hash: hash } })} aria-label="Quote">
        <AiOutlineLink className="icon-sm" />
      </button>
      <button className="icon-action-btn" onClick={() => dispatch({ type: 'ShowForwardBulletin', payload: { ObjectType: MessageObjectType.Bulletin, Address: address, Sequence: sequence, Hash: hash } })} aria-label="Forward">
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

export default React.memo(BulletinTools)
