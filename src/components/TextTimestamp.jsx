import { memo } from 'react'
import { timestamp_format } from "../lib/AppUtil"

const TextTimestamp = ({ timestamp, textSize = 'text-xs' }) => {
  return (
    <div className={`rounded-full px-1 border border-primary/30 dark:border-primary/40`}>
      <span className={`${textSize} timestamp`}>
        {timestamp_format(timestamp)}
      </span>
    </div>
  )
}

export default memo(TextTimestamp)