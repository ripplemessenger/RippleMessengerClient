import React from 'react'
import { HiHashtag } from 'react-icons/hi2'
import { IoCloseOutline } from 'react-icons/io5'
import { useDispatch } from 'react-redux'

const PublishTagItem = ({ tag }) => {

  const dispatch = useDispatch()

  return (
    <div className="flex flex-row items-center gap-1">
      <div className='tag-link' title={tag}>
        <HiHashtag className="icon-sm" />{tag}
      </div>
      <button className="close-btn-icon" onClick={() => dispatch({ type: 'BulletinTagDel', payload: { Tag: tag } })} aria-label={`Remove tag ${tag}`}>
        <IoCloseOutline className="text-sm" />
      </button>
    </div>
  )
}

export default React.memo(PublishTagItem)