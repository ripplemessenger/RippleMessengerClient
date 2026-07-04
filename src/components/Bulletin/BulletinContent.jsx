import { memo } from 'react'

const BulletinContent = memo(({ content, onClick }) => {
  return (
    <div className={`mt-1 p-3 rounded-lg border border-primary/10 dark:border-primary/20 bg-surface-alt/50 dark:bg-dark-surface-alt/50 ${onClick ? 'cursor-pointer hover:border-primary/30 transition-colors' : ''}`} onClick={onClick}>
      <pre className={`w-full whitespace-pre-wrap break-words text-sm leading-relaxed text-text-primary dark:text-dark-text-primary`}>
        {content}
      </pre>
    </div>
  )
})

BulletinContent.displayName = 'BulletinContent'

export default BulletinContent
