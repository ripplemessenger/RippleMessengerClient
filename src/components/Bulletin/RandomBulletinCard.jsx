import { memo, useCallback } from 'react'
import { createSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AiOutlineLink } from 'react-icons/ai'
import { IoAttachSharp } from 'react-icons/io5'

import AvatarName from '../AvatarName'
import TextTimestamp from '../TextTimestamp'
import BulletinAvatarLink from './BulletinAvatarLink'
import TagLink from './TagLink'

/**
 * Compact waterfall card for the random bulletin feed (3-column masonry).
 * Shows avatar + name, content preview, tag chips, quote/file counts and time.
 * No toolbar — the whole card is clickable and navigates to the bulletin detail.
 */
const RandomBulletinCard = ({ bulletin }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const goto_bulletin = useCallback(() => {
    const params = { hash: bulletin.hash, address: bulletin.address, sequence: bulletin.sequence }
    navigate({
      pathname: '/bulletin_view',
      search: `?${createSearchParams(params)}`
    })
  }, [bulletin.hash, bulletin.address, bulletin.sequence, navigate])

  const tags = bulletin.tag.slice(0, 2)

  // Waterfall cards use a shorter preview (128 chars) than ListBulletin (256)
  // so the masonry stays compact.
  const previewContent = bulletin.content.length > 128 ? bulletin.content.slice(0, 128) : bulletin.content

  return (
    <div
      className="break-inside-avoid mb-3 rounded-xl card bg-surface-alt/30 dark:bg-dark-surface-alt/30 card-hover cursor-pointer overflow-hidden"
      role="button"
      tabIndex={0}
      onClick={goto_bulletin}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') goto_bulletin()
      }}
      aria-label={t('bulletin.view_bulletin', { seq: bulletin.sequence })}
    >
      {/* Header — avatar + name + time */}
      <div className="flex items-center gap-2 px-3 pt-3">
        <div onClick={(e) => e.stopPropagation()}>
          <BulletinAvatarLink address={bulletin.address} classNames="avatar-sm" />
        </div>
        <span className="text-sm font-semibold truncate flex-1 min-w-0">
          <AvatarName address={bulletin.address} short_flag={true} />
        </span>
        <TextTimestamp timestamp={bulletin.signed_at} textSize="text-xs" />
      </div>

      {/* Content preview — variable height creates the masonry effect */}
      <div className="px-3 py-2 text-sm leading-relaxed text-text-primary dark:text-dark-text-primary break-words whitespace-pre-wrap">
        {previewContent}
      </div>

      {/* Footer — tag chips + quote/file counts */}
      <div className="flex items-center gap-1.5 px-3 pb-3 flex-wrap">
        {tags.map((tag) => (
          <span key={tag} className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <TagLink tag={tag} />
          </span>
        ))}
        {bulletin.quote.length !== 0 && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/30 text-secondary-dark dark:bg-secondary/40 dark:text-secondary-light">
            <AiOutlineLink className="text-xs" />
            {bulletin.quote.length}
          </span>
        )}
        {bulletin.file.length !== 0 && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-status-success/10 text-status-success dark:bg-status-success-dark/20 dark:text-status-success-dark">
            <IoAttachSharp className="text-xs" />
            {bulletin.file.length}
          </span>
        )}
      </div>
    </div>
  )
}

export default memo(RandomBulletinCard)
