import { useCallback, useState } from 'react'
import { JsonView, allExpanded, collapseAllNested, defaultStyles, darkStyles } from 'react-json-view-lite'
import { useDispatch, useSelector } from 'react-redux'
import 'react-json-view-lite/dist/index.css'
import { IoCopyOutline, IoCheckmarkOutline, IoCloseOutline } from "react-icons/io5"
import { setDisplayJson, setFlashNoticeMessage } from '../store/slices/CommonSlice'
import { FLASH_DURATION_MS } from '../lib/AppConst'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useTheme } from './ThemeProvider'

const JsonDiv = ({ json }) => {
  const { theme } = useTheme()
  const [copied, setCopied] = useState(false)

  const dispatch = useDispatch()
  const { DisplayJsonOption } = useSelector(state => state.Common)

  const closeJson = useCallback(() => dispatch(setDisplayJson({ json: null, isExpand: false })), [dispatch])
  useEscapeKey(closeJson)

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), FLASH_DURATION_MS)
    } catch {
      dispatch(setFlashNoticeMessage({ message: 'Copy failed', duration: FLASH_DURATION_MS }))
    }
  }

  return (
    <div className={`modal-overlay`} role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl mx-auto">
        <div className="modal-content-wrapper">
          <div className="flex justify-end gap-2 mb-3">
            {copied ? (
              <button onClick={() => copyText(JSON.stringify(json))} className="btn-sm btn-success">
                <IoCheckmarkOutline className="icon-sm" /> copied
              </button>
            ) : (
              <button onClick={() => copyText(JSON.stringify(json))} className="btn-sm btn-primary-outline">
                <IoCopyOutline className="icon-sm" /> copy
              </button>
            )}
            <button onClick={closeJson} className="btn-sm modal-btn-gray">
              <IoCloseOutline className="icon-sm" /> close
            </button>
          </div>
          <div className="max-h-[60vh] overflow-auto rounded-lg bg-surface-alt/30 dark:bg-dark-surface-alt/30 p-3">
            <JsonView data={json} shouldExpandNode={DisplayJsonOption ? allExpanded : collapseAllNested} style={theme === 'dark' ? darkStyles : defaultStyles} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default JsonDiv
