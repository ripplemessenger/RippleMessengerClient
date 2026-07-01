import React, { useCallback } from 'react'
import { createSearchParams, useNavigate } from 'react-router-dom'
import { AiOutlineLink } from 'react-icons/ai'
import { HiHashtag } from 'react-icons/hi2'
import { IoAttachSharp } from 'react-icons/io5'

import BulletinAvatarLink from './BulletinAvatarLink'
import BulletinContentForList from './BulletinContentForList'
import BulletinLink from './BulletinLink'
import BulletinTools from './BulletinTools'
import TextTimestamp from '../TextTimestamp'
import { BulletinContentPreviewSize } from '../../lib/AppConst'

const ListBulletin = ({ bulletin, textSize = 'text-base' }) => {

  const navigate = useNavigate()

  const goto_bulletin = useCallback(() => {
    const params = { hash: bulletin.hash, address: bulletin.address, sequence: bulletin.sequence }
    navigate({
      pathname: '/bulletin_view',
      search: `?${createSearchParams(params)}`
    })
  }, [bulletin.hash, bulletin.address, bulletin.sequence, navigate])

  const previewContent = bulletin.content.length > BulletinContentPreviewSize
    ? bulletin.content.slice(0, BulletinContentPreviewSize)
    : bulletin.content

  return (
    <div className={`${textSize} w-full min-w-0 overflow-hidden rounded-xl card-hover mt-2 bg-surface-alt/30 dark:bg-dark-surface-alt/30`}>

      {/* Header row — avatar + link grouped tight; metadata, tags, tools on the right. */}
      <div className="flex flex-row items-center w-full px-3 py-2 gap-2 rounded-t-xl">
        <BulletinAvatarLink address={bulletin.address} classNames={'avatar-sm'} />
        <div className="flex flex-col flex-1 min-w-0 gap-1.5">

          {/* Top line: link+timestamp grouped left, tags right */}
          <div className="flex flex-row items-center gap-2 font-semibold">
            <div className="flex items-center gap-1.5 shrink-0">
              <BulletinLink address={bulletin.address} sequence={bulletin.sequence} hash={bulletin.hash} />
              <TextTimestamp timestamp={bulletin.signed_at} textSize={'text-xs'} />
            </div>
            <div className="flex flex-row items-center gap-1.5 flex-wrap">
              {
                bulletin.tag.length !== 0 &&
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary dark:bg-primary/20 dark:text-dark-primary">
                  <HiHashtag className="text-sm" />{bulletin.tag.length}
                </span>
              }
              {
                bulletin.quote.length !== 0 &&
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/30 text-secondary-dark dark:bg-secondary/40 dark:text-secondary-light">
                  <AiOutlineLink className="text-sm" />{bulletin.quote.length}
                </span>
              }
              {
                bulletin.file.length !== 0 &&
                <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-status-success/10 text-status-success dark:bg-status-success-dark/20 dark:text-status-success-dark">
                  <IoAttachSharp className="text-sm" />{bulletin.file.length}
                </span>
              }
            </div>
          </div>
          <BulletinTools address={bulletin.address} sequence={bulletin.sequence} hash={bulletin.hash} json={bulletin.json} content={bulletin.content} is_marked={bulletin.is_marked} />
        </div>
      </div>

      {/* Divider — same width as header and content sections */}
      <div className="w-full border-b border-primary/10 dark:border-primary/20" />

      {/* Content section — clickable to navigate to bulletin detail */}
      <div className="px-3 py-2 w-full min-w-0 overflow-hidden cursor-pointer" role="button" tabIndex={0} onClick={goto_bulletin} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goto_bulletin() }} aria-label={`View bulletin #${bulletin.sequence}`}>
        <BulletinContentForList content={previewContent} />
      </div>
    </div>
  )
}

export default React.memo(ListBulletin)