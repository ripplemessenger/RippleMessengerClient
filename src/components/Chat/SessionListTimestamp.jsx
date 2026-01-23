import { timestamp_format } from "../../lib/AppUtil"

const SessionListTimestamp = ({ timestamp, textSize = 'text-xs' }) => {
  return (
    <div className={`rounded-full px-1 border border-gray-400`}>
      <span className={`${textSize} text-gray-500 dark:text-slate-200 text-left`}>
        {timestamp_format(timestamp)}
      </span>
    </div>
  )
}

export default SessionListTimestamp