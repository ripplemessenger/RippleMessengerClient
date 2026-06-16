import { useState } from 'react'
import { JsonView, allExpanded, collapseAllNested, defaultStyles, darkStyles } from 'react-json-view-lite'
import { useDispatch, useSelector } from 'react-redux'
import 'react-json-view-lite/dist/index.css'
import { IoCopyOutline, IoCheckmarkOutline, IoCloseOutline } from "react-icons/io5"
import { setDisplayJson } from '../store/slices/CommonSlice'

const JsonDiv = ({ json }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme'))
  const [copied, setCopied] = useState(false)

  const dispatch = useDispatch()
  const { DisplayJsonOption } = useSelector(state => state.Common)

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.error('copy fail...', err)
      alert('copy fail...')
    }
  }

  return (
    <div className={`modal-overlay`}>
      <div className="modal-action-row">
        {
          copied ?
            <button onClick={() => copyText(JSON.stringify(json))} className="modal-btn-yellow">
              <IoCheckmarkOutline />copied
            </button>
            :
            <button onClick={() => copyText(JSON.stringify(json))} className="modal-btn-yellow">
              <IoCopyOutline /> copy
            </button>
        }
        <button onClick={() => dispatch(setDisplayJson({ json: null, isExpand: false }))} className="modal-btn-green">
          <IoCloseOutline /> close
        </button>
      </div>
      <div className="modal-content-wrapper">
        <JsonView data={json} shouldExpandNode={DisplayJsonOption ? allExpanded : collapseAllNested} style={theme === 'dark' ? darkStyles : defaultStyles} />
      </div>
    </div>
  )
}

export default JsonDiv
