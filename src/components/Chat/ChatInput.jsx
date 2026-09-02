import { useState, memo } from 'react'
import { IoAttachOutline, IoSendOutline } from 'react-icons/io5'
import { useTranslation } from 'react-i18next'

/**
 * Chat input bar with textarea, attach button, and send button.
 *
 * @param {object} props
 * @param {boolean} [props.disabled=false] - Disable all inputs when true
 * @param {(content: string) => void} [props.onSend] - Called on send button click or Enter with message content (Shift+Enter inserts a newline)
 * @param {() => void} [props.onAttach] - Called on attach button click
 */
const ChatInput = ({ disabled = false, onSend, onAttach }) => {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
        placeholder={t('ui.type_message')}
      />
      <div className="flex flex-col gap-2">
        <button
          onClick={onAttach}
          disabled={disabled}
          className="p-3 rounded-lg text-text-secondary dark:text-dark-text-secondary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors shadow-sm"
          title={t('ui.send_file')}
          aria-label={t('ui.send_file')}
        >
          <IoAttachOutline className="text-xl" />
        </button>
        <button
          onClick={handleSend}
          disabled={disabled}
          className="p-3 rounded-lg text-white bg-primary hover:bg-primary-dark transition-all shadow-gold hover:shadow-gold-lg active:scale-95"
          title={t('ui.send_message')}
          aria-label={t('ui.send_message')}
        >
          <IoSendOutline className="text-xl" />
        </button>
      </div>
    </div>
  )
}

export default memo(ChatInput)
