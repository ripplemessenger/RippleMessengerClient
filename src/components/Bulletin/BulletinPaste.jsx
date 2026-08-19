import { useCallback, useState, useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { IoCloseOutline } from 'react-icons/io5'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { setPasteFlag } from '../../store/slices/MessengerSlice'
import { FLASH_DURATION_MS } from '../../lib/AppConst'
import { setFlashNoticeMessage } from '../../store/slices/CommonSlice'
import { UploadBulletin } from '../../store/sagas/messenger.actions'
import { checkBulletinSchema } from '../../lib/MessageSchemaVerifier'
import { VerifyJsonSignature } from '../../lib/MessengerUtil'

const BulletinPaste = () => {
  const { t } = useTranslation()
  const [tmpBulletin, setTmpBulletin] = useState('')
  const [validation, setValidation] = useState(null)
  const textareaRef = useRef(null)
  const dialogRef = useRef(null)
  const dispatch = useDispatch()

  const handleClose = useCallback(() => dispatch(setPasteFlag(false)), [dispatch])
  useEscapeKey(handleClose)
  useFocusTrap(dialogRef, textareaRef)

  // Validate on every change — auto-submit when valid
  useEffect(() => {
    const trimmed = tmpBulletin.trim()
    if (trimmed === '') {
      setValidation(null)
      return
    }
    try {
      const json = JSON.parse(trimmed)
      if (!checkBulletinSchema(json)) {
        setValidation('schema')
        return
      }
      if (!VerifyJsonSignature(json)) {
        setValidation('signature')
        return
      }
      // Valid — save immediately
      dispatch(UploadBulletin({ json }))
      dispatch(setFlashNoticeMessage({ message: t('bulletin.saved'), duration: FLASH_DURATION_MS }))
      dispatch(setPasteFlag(false))
      setValidation(null)
    } catch {
      setValidation('json')
    }
  }, [tmpBulletin])

  return (
    <div className={`modal-overlay`} role="dialog" aria-modal="true">
      <div ref={dialogRef} className="max-w-3xl w-full mx-4 flex flex-col max-h-[85vh]">
        <div className="modal-header-bar">
          <span className={`label text-base`}>{t('ui.paste_bulletin_json')}</span>
          <button
            onClick={handleClose}
            className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
            aria-label={t('common.close')}
          >
            <IoCloseOutline className="text-lg text-text-secondary dark:text-dark-text-secondary" />
          </button>
        </div>

        <div className="modal-content-area gap-3">
          <textarea
            ref={textareaRef}
            value={tmpBulletin}
            placeholder={t('ui.paste_here')}
            rows="6"
            onChange={(e) => setTmpBulletin(e.target.value)}
            className={`px-3 py-2 border rounded-lg appearance-none resize-none input-color input-hover`}
          />
          {validation === 'json' && <span className="label-error">{t('ui.not_valid_json')}</span>}
          {validation === 'schema' && <span className="label-error">{t('ui.bulletin_schema_invalid')}</span>}
          {validation === 'signature' && <span className="label-error">{t('ui.signature_invalid')}</span>}
        </div>
      </div>
    </div>
  )
}

export default BulletinPaste
