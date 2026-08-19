import React from 'react'
import { useDispatch } from 'react-redux'
import { IoCloseOutline } from 'react-icons/io5'
import { useTranslation } from 'react-i18next'

import BulletinLink from './BulletinLink'
import { BulletinQuoteDel } from '../../store/sagas/messenger.actions'

const PublishQuoteItem = ({ address, sequence, hash }) => {
  const { t } = useTranslation()

  const dispatch = useDispatch()

  return (
    <div className="flex flex-row items-center gap-1">
      <BulletinLink address={address} sequence={sequence} hash={hash} />
      <button className="close-btn-icon" onClick={() => dispatch(BulletinQuoteDel({ Hash: hash }))} aria-label={t('ui.remove_quote')}>
        <IoCloseOutline className="text-sm" />
      </button>
    </div>
  )
}

export default React.memo(PublishQuoteItem)