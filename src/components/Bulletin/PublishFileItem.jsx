import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { filesize_format } from '../../lib/AppUtil'
import { IoAttachSharp } from 'react-icons/io5'

const PublishFileItem = ({ name, ext, size, hash }) => {

  const navigate = useNavigate()
  const dispatch = useDispatch()

  return (
    <div className='flex flex-row'>
      <div className='file-link' title={filesize_format(size)} >
        <IoAttachSharp />{name}{ext}
      </div>
      <div className='file-del' onClick={() => dispatch({ type: 'BulletinFileDel', payload: { Hash: hash } })}>
        X
      </div>
    </div>
  )
}

export default PublishFileItem