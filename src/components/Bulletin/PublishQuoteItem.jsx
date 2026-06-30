import React from 'react'
import { useDispatch } from 'react-redux'
import BulletinLink from './BulletinLink'
import { IoCloseOutline } from 'react-icons/io5'

const PublishQuoteItem = ({ address, sequence, hash }) => {

  const dispatch = useDispatch()

  return (
    <div className="flex flex-row items-center gap-1">
      <BulletinLink address={address} sequence={sequence} hash={hash} />
      <button className="close-btn-icon" onClick={() => dispatch({ type: 'BulletinQuoteDel', payload: { Hash: hash } })} aria-label="Remove quote">
        <IoCloseOutline className="text-sm" />
      </button>
    </div>
  )
}

export default React.memo(PublishQuoteItem)