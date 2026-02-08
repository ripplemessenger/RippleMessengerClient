import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { setDisplayJson, setFlashNoticeMessage } from '../../store/slices/UserSlice'
import { IoStar, IoStarOutline, IoCopyOutline, IoArrowRedoOutline, IoInformationCircleOutline } from "react-icons/io5"
import { AiOutlineLink } from "react-icons/ai"
import { MdPostAdd } from "react-icons/md"
import { MessageObjectType } from '../../lib/MessengerConst'

const BulletinTools = ({ address, sequence, hash, content, json, is_marked = false }) => {

  const [displayMark, setDisplayMark] = useState(is_marked)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const copyText = async (text) => {
    await navigator.clipboard.writeText(text)
    dispatch(setFlashNoticeMessage({ message: 'copy content success', duration: 3000 }))
  }

  const toggleMarkDisplay = async () => {
    setDisplayMark(!displayMark)
  }

  return (
    <div className={`flex flex-row justify-start`}>
      {
        displayMark ?
          <IoStar className="icon-sm" onClick={() => {
            dispatch({
              type: 'BulletinMarkToggle',
              payload: { hash: hash }
            })
            toggleMarkDisplay()
          }} />
          :
          <IoStarOutline className="icon-sm" onClick={() => {
            dispatch({
              type: 'BulletinMarkToggle',
              payload: { hash: hash }
            })
            toggleMarkDisplay()
          }} />
      }
      <MdPostAdd className="icon-sm" onClick={() => {
        dispatch({
          type: 'BulletinReply',
          payload: {
            Address: address,
            Sequence: sequence,
            Hash: hash
          }
        })
      }} />
      <AiOutlineLink className="icon-sm" onClick={() => {
        dispatch({
          type: 'BulletinQuote',
          payload: {
            Address: address,
            Sequence: sequence,
            Hash: hash
          }
        })
      }} />
      <IoArrowRedoOutline className="icon-sm" onClick={() => {
        dispatch({
          type: 'ShowForwardBulletin',
          payload: {
            ObjectType: MessageObjectType.Bulletin,
            Address: address,
            Sequence: sequence,
            Hash: hash
          }
        })
      }} />
      <IoCopyOutline className="icon-sm" onClick={() => copyText(content)} />
      <IoInformationCircleOutline className="icon-sm" onClick={() => { dispatch(setDisplayJson({ json: json, isExpand: true })) }} />
    </div>
  )
}

export default BulletinTools