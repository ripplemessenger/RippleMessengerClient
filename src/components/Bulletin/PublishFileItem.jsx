import { memo } from 'react'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { IoAttachSharp, IoCloseOutline } from 'react-icons/io5'

import { filesize_format } from '../../lib/AppUtil'
import { BulletinFileDel } from '../../store/sagas/messenger.actions'

const PublishFileItem = ({ name, ext, size, hash }) => {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  return (
    <div className="flex flex-row items-center gap-1">
      <div className="file-link" title={filesize_format(size)}>
        <IoAttachSharp />
        {name}
        {ext}
      </div>
      <button
        className="close-btn-icon"
        onClick={() => dispatch(BulletinFileDel({ Hash: hash }))}
        aria-label={t('bulletin.remove_file', { name: `${name}${ext}` })}
      >
        <IoCloseOutline className="text-sm" />
      </button>
    </div>
  )
}

export default memo(PublishFileItem)
