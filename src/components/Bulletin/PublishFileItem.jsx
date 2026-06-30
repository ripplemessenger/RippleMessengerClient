import React from 'react'
import { IoCloseOutline, IoAttachSharp } from 'react-icons/io5'
import { filesize_format } from '../../lib/AppUtil'
import { useDispatch } from 'react-redux'

const PublishFileItem = ({ name, ext, size, hash }) => {

  const dispatch = useDispatch()

  return (
    <div className="flex flex-row items-center gap-1">
      <div className='file-link' title={filesize_format(size)} >
        <IoAttachSharp />{name}{ext}
      </div>
      <button className="close-btn-icon" onClick={() => dispatch({ type: 'BulletinFileDel', payload: { Hash: hash } })} aria-label={`Remove file ${name}${ext}`}>
        <IoCloseOutline className="text-sm" />
      </button>
    </div>
  )
}

export default React.memo(PublishFileItem)