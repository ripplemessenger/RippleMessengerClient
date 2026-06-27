import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { IoStar, IoStarOutline, IoCopyOutline, IoArrowRedoOutline, IoInformationCircleOutline } from "react-icons/io5"
import { AiOutlineLink } from "react-icons/ai"
import { MdPostAdd } from "react-icons/md"
import { MessageObjectType } from '../../lib/MessengerConst'
import { setDisplayJson, setFlashNoticeMessage } from '../../store/slices/CommonSlice'

const BulletinTools = ({ address, sequence, hash, content, json, is_marked = false }) => {

  const [displayMark, setDisplayMark] = useState(is_marked)

  const dispatch = useDispatch()

  const copyText = async (text) => {
    await navigator.clipboard.writeText(text)
    dispatch(setFlashNoticeMessage({ message: 'copy content success', duration: 3000 }))
  }

  const toggleMarkDisplay = async () => {
    setDisplayMark(!displayMark)
  }

  return (
    <div className={`flex flex-row gap-1`}>
      {displayMark ? (
        <IoStar className="tool-icon" onClick={() => { dispatch({ type: 'BulletinMarkToggle', payload: { hash } }); toggleMarkDisplay() }} />
      ) : (
        <IoStarOutline className="tool-icon" onClick={() => { dispatch({ type: 'BulletinMarkToggle', payload: { hash } }); toggleMarkDisplay() }} />
      )}
      <MdPostAdd className="tool-icon" onClick={() => dispatch({ type: 'BulletinReply', payload: { Address: address, Sequence: sequence, Hash: hash } })} />
      <AiOutlineLink className="tool-icon" onClick={() => dispatch({ type: 'BulletinQuote', payload: { Address: address, Sequence: sequence, Hash: hash } })} />
      <IoArrowRedoOutline className="tool-icon" onClick={() => dispatch({ type: 'ShowForwardBulletin', payload: { ObjectType: MessageObjectType.Bulletin, Address: address, Sequence: sequence, Hash: hash } })} />
      <IoCopyOutline className="tool-icon" onClick={() => copyText(content)} />
      <IoInformationCircleOutline className="tool-icon" onClick={() => dispatch(setDisplayJson({ json, isExpand: true }))} />
    </div>
  )
}

export default BulletinTools
