import { timestamp_format } from "../lib/AppUtil"

const TextTimestamp = ({ timestamp, textSize = 'text-xs' }) => {
  return (
    <div className={`rounded-full px-1 border border-gray-400`}>
      <span className={`${textSize} timestamp`}>
        {timestamp_format(timestamp)}
      </span>
    </div>
  )
}

export default TextTimestamp