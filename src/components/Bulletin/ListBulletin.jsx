import { useDispatch } from 'react-redux'
import { createSearchParams, useNavigate } from 'react-router-dom'
import BulletinContent from './BulletinContent'
import BulletinLink from './BulletinLink'
import BulletinTools from './BulletinTools'
import TextTimestamp from '../TextTimestamp'
import AvatarImage from '../AvatarImage'
import { AiOutlineLink } from "react-icons/ai"
import { BulletinContentPreviewSize } from '../../lib/AppConst'
import { IoAttachSharp } from 'react-icons/io5'
import { setBulletinAddress } from '../../store/slices/MessengerSlice'
import { HiHashtag } from 'react-icons/hi2'

const ListBulletin = ({ bulletin, textSize = 'text-base' }) => {

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const goto_bulletin = () => {
    const params = { hash: bulletin.hash, address: bulletin.address, sequence: bulletin.sequence }
    navigate({
      pathname: '/bulletin_view',
      search: `?${createSearchParams(params)}`
    })
  }

  const goto_address = (address) => {
    dispatch(setBulletinAddress(address))
    navigate('/bulletin_address')
  }

  return (
    <div className={`${textSize}`}>
      <div className={`flex flex-row mx-5px mt-5px`}>
        <AvatarImage address={bulletin.address} timestamp={Date.now()} style={'avatar-sm'} onClick={() => goto_address(bulletin.address)} />
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
        <BulletinContent content={bulletin.content} onClick={() => goto_bulletin()} />
        :
        <BulletinContent content={bulletin.content.slice(0, BulletinContentPreviewSize)} onClick={() => goto_bulletin()} />
      }
    </div>
  )
}

export default ListBulletin