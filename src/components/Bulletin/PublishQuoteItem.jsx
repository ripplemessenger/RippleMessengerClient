import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import BulletinLink from './BulletinLink'

const PublishQuoteItem = ({ address, sequence, hash }) => {

  const navigate = useNavigate()
  const dispatch = useDispatch()

  return (
    <div className='flex flex-row'>
      <BulletinLink address={address} sequence={sequence} hash={hash} />
      <div className='quote-del' onClick={() => dispatch({ type: 'BulletinQuoteDel', payload: { Hash: hash } })}>
        X
      </div>
    </div>
  )
}

export default PublishQuoteItem