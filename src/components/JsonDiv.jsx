import { useState, useEffect } from 'react'
import { JsonView, allExpanded, collapseAllNested, defaultStyles, darkStyles } from 'react-json-view-lite'
import { useDispatch, useSelector } from 'react-redux'
import 'react-json-view-lite/dist/index.css'
import { IoCopyOutline, IoCheckmarkOutline, IoCloseOutline } from "react-icons/io5"
import { setDisplayJson } from '../store/slices/UserSlice'

const JsonDiv = ({ json }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme'))
  const [copied, setCopied] = useState(false)

  const dispatch = useDispatch()
  const { DisplayJsonOption } = useSelector(state => state.User)

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
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-5 backdrop-blur-sm`}>
      <div className="flex flex-row items-center justify-center">
        {copied ? (
          <button onClick={() => copyText(JSON.stringify(json))} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-yellow-300 hover:bg-gray-200 dark:hover:bg-gray-600">
            <IoCheckmarkOutline />copied
          </button>
        ) : (
          <button onClick={() => copyText(JSON.stringify(json))} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-yellow-300 hover:bg-gray-200 dark:hover:bg-gray-600">
            <IoCopyOutline /> copy
          </button>
        )}
        <button onClick={() => dispatch(setDisplayJson({ json: null, isExpand: false }))} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-green-300 hover:bg-gray-200 dark:hover:bg-gray-600">
          <IoCloseOutline /> close
        </button>
      </div>
      <div className="max-w-7xl overflow-x-auto overflow-y-auto whitespace-normal break-words p-2 rounded-xl shadow-2xl items-center">
        <JsonView data={json} shouldExpandNode={DisplayJsonOption ? allExpanded : collapseAllNested} style={theme === 'dark' ? darkStyles : defaultStyles} />
      </div>
    </div>
  )
}

export default JsonDiv