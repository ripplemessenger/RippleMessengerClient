import { useCallback, useState, useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { IoCloseOutline } from "react-icons/io5"
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { setPasteFlag } from '../../store/slices/MessengerSlice'
import { FLASH_DURATION_MS } from '../../lib/AppConst'
import { setFlashNoticeMessage } from '../../store/slices/CommonSlice'
import { UploadBulletin } from '../../store/sagas/messenger.actions'
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

  const handleClose = useCallback(() => dispatch(setPasteFlag(false)), [dispatch])
  useEscapeKey(handleClose)

  // Validate on every change — auto-submit when valid
  useEffect(() => {
    const trimmed = tmpBulletin.trim()
    if (trimmed === '') { setValidation(null); return }
    try {
      const json = JSON.parse(trimmed)
      if (!checkBulletinSchema(json)) { setValidation('schema'); return }
      if (!VerifyJsonSignature(json)) { setValidation('signature'); return }
      // Valid — save immediately
      dispatch(UploadBulletin({ json }))
      dispatch(setFlashNoticeMessage({ message: 'bulletin saved success', duration: FLASH_DURATION_MS }))
      dispatch(setPasteFlag(false))
      setValidation(null)
    } catch {
      setValidation('json')
    }
  }, [tmpBulletin])

  return (
    <div className={`modal-overlay`} role="dialog" aria-modal="true">
      <div className="max-w-3xl w-full mx-4 flex flex-col max-h-[85vh]">
        <div className="modal-header-bar">
          <span className={`label text-base`}>Paste bulletin JSON to save</span>
          <button onClick={handleClose} className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors" aria-label="Close">
            <IoCloseOutline className="text-lg text-text-secondary dark:text-dark-text-secondary" />
          </button>
        </div>

        <div className="modal-content-area gap-3">
          <textarea
            ref={textareaRef}
            value={tmpBulletin}
            placeholder='Paste here'
            rows="6"
            onChange={(e) => setTmpBulletin(e.target.value)}
            className={`px-3 py-2 border rounded-lg appearance-none resize-none input-color input-hover`}
          />
          {validation === 'json' && (
            <span className="label-error">⚠ not valid JSON</span>
          )}
          {validation === 'schema' && (
            <span className="label-error">⚠ bulletin schema invalid</span>
          )}
          {validation === 'signature' && (
            <span className="label-error">⚠ signature invalid</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default BulletinPaste
