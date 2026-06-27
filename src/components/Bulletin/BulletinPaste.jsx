import { useState, useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { IoCloseOutline } from "react-icons/io5"
import { setPasteFlag } from '../../store/slices/MessengerSlice'
import { setFlashNoticeMessage } from '../../store/slices/CommonSlice'
import { checkBulletinSchema } from '../../lib/MessageSchemaVerifier'
import { VerifyJsonSignature } from '../../lib/MessengerUtil'

const BulletinPaste = () => {
  const [tmpBulletin, setTmpBulletin] = useState('')
  const [validation, setValidation] = useState(null)
  const textareaRef = useRef(null)
  const dispatch = useDispatch()

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // ESC to close
  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        dispatch(setPasteFlag(false))
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [])

  // Validate on every change — auto-submit when valid
  useEffect(() => {
    const trimmed = tmpBulletin.trim()
    if (trimmed === '') { setValidation(null); return }
    try {
      const json = JSON.parse(trimmed)
      if (!checkBulletinSchema(json)) { setValidation('schema'); return }
      if (!VerifyJsonSignature(json)) { setValidation('signature'); return }
      // Valid — save immediately
      dispatch({ type: 'UploadBulletin', payload: { json } })
      dispatch(setFlashNoticeMessage({ message: 'bulletin saved success', duration: 3000 }))
      dispatch(setPasteFlag(false))
      setValidation(null)
    } catch {
      setValidation('json')
    }
  }, [tmpBulletin])

  return (
    <div className={`modal-overlay`}>
      <div className="max-w-3xl w-full mx-4 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20 dark:border-primary/30 rounded-t-xl bg-gradient-card dark:bg-dark-gradient-card shadow-lg">
          <span className={`label text-base`}>Paste Bulletin</span>
          <button onClick={() => dispatch(setPasteFlag(false))} className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors">
            <IoCloseOutline className="text-lg text-text-secondary dark:text-dark-text-secondary" />
          </button>
        </div>

        <div className="flex flex-col overflow-y-auto px-4 py-3 bg-gradient-card dark:bg-dark-gradient-card grow gap-3">
          <textarea
            ref={textareaRef}
            value={tmpBulletin}
            placeholder='Paste bulletin JSON here'
            rows="6"
            onChange={(e) => setTmpBulletin(e.target.value)}
            className={`px-3 py-2 border rounded-lg appearance-none resize-none input-color input-hover`}
          />
          {validation === 'json' && (
            <span className="text-sm font-medium text-status-error dark:text-status-error-dark">⚠ not valid JSON</span>
          )}
          {validation === 'schema' && (
            <span className="text-sm font-medium text-status-error dark:text-status-error-dark">⚠ bulletin schema invalid</span>
          )}
          {validation === 'signature' && (
            <span className="text-sm font-medium text-status-error dark:text-status-error-dark">⚠ signature invalid</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default BulletinPaste
