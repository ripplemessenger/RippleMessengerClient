import { useState, memo } from 'react'
import { IoAttachOutline, IoSendOutline } from 'react-icons/io5'

/**
 * Chat input bar with textarea, attach button, and send button.
 *
 * @param {object} props
 * @param {boolean} [props.disabled=false] - Disable all inputs when true
 * @param {(content: string) => void} [props.onSend] - Called on send button click or Ctrl+Enter with message content
 * @param {() => void} [props.onAttach] - Called on attach button click
 */
const ChatInput = ({ disabled = false, onSend, onAttach }) => {
  const [message, setMessage] = useState('')

  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    onSend?.(message)
    setMessage('')
  }

  return (
    <div className="shrink-0 mt-3 flex items-end gap-3">
      <textarea
        value={message}
        disabled={disabled}
        rows={3}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        className="p-3 w-full border rounded-lg shadow-sm appearance-none input-color input-hover resize-none"
        placeholder="Type a message..."
      />
      <div className="flex flex-col gap-2">
        <button onClick={onAttach} disabled={disabled} className="p-3 rounded-lg text-text-secondary dark:text-dark-text-secondary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors shadow-sm" title="Send file" aria-label="Send file">
          <IoAttachOutline className="text-xl" />
        </button>
        <button onClick={handleSend} disabled={disabled} className="p-3 rounded-lg text-white bg-primary hover:bg-primary-dark transition-all shadow-gold hover:shadow-gold-lg active:scale-95" title="Send message" aria-label="Send message">
          <IoSendOutline className="text-xl" />
        </button>
      </div>
    </div>
  )
}

export default memo(ChatInput)
