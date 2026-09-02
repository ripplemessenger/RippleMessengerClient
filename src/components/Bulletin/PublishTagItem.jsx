import React from 'react'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { HiHashtag } from 'react-icons/hi2'
import { IoCloseOutline } from 'react-icons/io5'

import { BulletinTagDel } from '../../store/sagas/messenger.actions'

const PublishTagItem = ({ tag }) => {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  return (
    <div className="flex flex-row items-center gap-1">
      <div className="tag-link" title={tag}>
        <HiHashtag className="icon-sm" />
        {tag}
      </div>
      <button
        className="close-btn-icon"
        onClick={() => dispatch(BulletinTagDel({ Tag: tag }))}
        aria-label={t('bulletin.remove_tag', { tag })}
      >
        <IoCloseOutline className="text-sm" />
      </button>
    </div>
  )
}

export default React.memo(PublishTagItem)
