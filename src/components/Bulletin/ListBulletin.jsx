import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { createSearchParams, useNavigate } from 'react-router-dom'
import BulletinContent from './BulletinContent'
import BulletinLink from './BulletinLink'
import BulletinTools from './BulletinTools'
import TextTimestamp from '../TextTimestamp'
import AvatarImage from '../AvatarImage'
import { AiOutlineLink } from "react-icons/ai"
import { FaHashtag } from "react-icons/fa"
import { BulletinContentPreviewSize } from '../../lib/AppConst'
import { IoAttachSharp } from 'react-icons/io5'

const ListBulletin = ({ bulletin, textSize = 'text-base' }) => {

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const goto_bulletin = () => {
    const params = { hash: bulletin.Hash, address: bulletin.Address, sequence: bulletin.Sequence };
    navigate({
      pathname: '/bulletin_view',
      search: `?${createSearchParams(params)}`
    })
  }

  return (
    <div className={`${textSize}`}>
      <div className={`flex flex-row mx-5px mt-5px`}>
        <AvatarImage address={bulletin.Address} timestamp={Date.now()} style={'avatar-sm'} />
        <div className={`flex flex-col`}>

          <div className={`flex flex-row justify-between`}>
            <BulletinLink address={bulletin.Address} sequence={bulletin.Sequence} hash={bulletin.Hash} />
            <TextTimestamp timestamp={bulletin.SignedAt} textSize={'text-xs'} />
            {
              bulletin.Tag.length !== 0 &&
              <div className={`text-base flex flex-row items-center font-bold text-gray-400 dark:text-gray-200`}>
                <FaHashtag />{bulletin.Tag.length}
              </div>
            }
            {
              bulletin.Quote.length !== 0 &&
              <div className={`text-base flex flex-row items-center font-bold text-gray-400 dark:text-gray-200`}>
                <AiOutlineLink />{bulletin.Quote.length}
              </div>
            }
            {
              bulletin.File.length !== 0 &&
              <div className={`text-base flex flex-row items-center font-bold text-gray-400 dark:text-gray-200`}>
                <IoAttachSharp />{bulletin.File.length}
              </div>
            }
          </div>
          <BulletinTools address={bulletin.Address} sequence={bulletin.Sequence} hash={bulletin.Hash} json={bulletin.Json} content={bulletin.Content} is_mark={bulletin.IsMark} />
        </div>
      </div>

      {bulletin.Content.length <= BulletinContentPreviewSize ?
        <BulletinContent content={bulletin.Content} onClick={() => goto_bulletin()} />
        :
        <BulletinContent content={bulletin.Content.slice(0, BulletinContentPreviewSize)} onClick={() => goto_bulletin()} />
      }
    </div>
  )
}

export default ListBulletin