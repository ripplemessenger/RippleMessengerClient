import { memo } from 'react'
import { useDispatch } from 'react-redux'
import { IoAttachSharp, IoCloseOutline } from 'react-icons/io5'

import { filesize_format } from '../../lib/AppUtil'
import { BulletinFileDel } from '../../store/sagas/messenger.actions'

const PublishFileItem = ({ name, ext, size, hash }) => {

  const dispatch = useDispatch()

  return (
    <div className="flex flex-row items-center gap-1">
      <div className='file-link' title={filesize_format(size)} >
        <IoAttachSharp />{name}{ext}
      </div>
      <button className="close-btn-icon" onClick={() => dispatch(BulletinFileDel({ Hash: hash }))} aria-label={`Remove file ${name}${ext}`}>
        <IoCloseOutline className="text-sm" />
      </button>
    </div>
  )
}

export default memo(PublishFileItem)