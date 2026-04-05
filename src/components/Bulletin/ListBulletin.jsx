import { createSearchParams, useNavigate } from 'react-router-dom'
import BulletinLink from './BulletinLink'
import BulletinTools from './BulletinTools'
import TextTimestamp from '../TextTimestamp'
import { AiOutlineLink } from "react-icons/ai"
import { BulletinContentPreviewSize } from '../../lib/AppConst'
import { IoAttachSharp } from 'react-icons/io5'
import { HiHashtag } from 'react-icons/hi2'
import BulletinAvatarLink from './BulletinAvatarLink'
import BulletinContentForList from './BulletinContentForList'

const ListBulletin = ({ bulletin, textSize = 'text-base' }) => {

  const navigate = useNavigate()

  const goto_bulletin = () => {
    const params = { hash: bulletin.hash, address: bulletin.address, sequence: bulletin.sequence }
    navigate({
      pathname: '/bulletin_view',
      search: `?${createSearchParams(params)}`
    })
  }

  return (
    <div className={`${textSize}`}>
      <div className={`flex flex-row mx-5px mt-5px`}>
        <BulletinAvatarLink address={bulletin.address} timestamp={Date.now()} style={'avatar-sm'} />
        <div className={`flex flex-col`}>

          <div className={`flex flex-row justify-between`}>
            <BulletinLink address={bulletin.address} sequence={bulletin.sequence} hash={bulletin.hash} timestamp={Date.now()} />
            <TextTimestamp timestamp={bulletin.signed_at} textSize={'text-xs'} />
            {
              bulletin.tag.length !== 0 &&
              <div className={`text-base flex flex-row items-center font-bold text-gray-400 dark:text-gray-200`}>
                <HiHashtag />{bulletin.tag.length}
              </div>
            }
            {
              bulletin.quote.length !== 0 &&
              <div className={`text-base flex flex-row items-center font-bold text-gray-400 dark:text-gray-200`}>
                <AiOutlineLink />{bulletin.quote.length}
              </div>
            }
            {
              bulletin.file.length !== 0 &&
              <div className={`text-base flex flex-row items-center font-bold text-gray-400 dark:text-gray-200`}>
                <IoAttachSharp />{bulletin.file.length}
              </div>
            }
          </div>
          <BulletinTools address={bulletin.address} sequence={bulletin.sequence} hash={bulletin.hash} json={bulletin.json} content={bulletin.content} is_marked={bulletin.is_marked} />
        </div>
      </div>

      {bulletin.content.length <= BulletinContentPreviewSize ?
        <BulletinContentForList content={bulletin.content} onClick={() => goto_bulletin()} />
        :
        <BulletinContentForList content={bulletin.content.slice(0, BulletinContentPreviewSize)} onClick={() => goto_bulletin()} />
      }
    </div>
  )
}

export default ListBulletin