import React from 'react'

const BulletinContentForList = ({ content, onClick, className = '' }) => {
  return (
    <p className={`mt-1 min-w-0 overflow-hidden text-sm leading-relaxed text-text-primary dark:text-dark-text-primary break-all whitespace-pre-wrap line-clamp-6 ${onClick ? 'cursor-pointer' : ''} ${className}`} onClick={onClick}>
      {content}
    </p>
  )
}

export default React.memo(BulletinContentForList)