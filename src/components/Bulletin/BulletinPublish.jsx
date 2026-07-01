import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { open } from '@tauri-apps/plugin-dialog'
import { IoAttachSharp, IoCloseOutline } from 'react-icons/io5'
import { MdPublish } from 'react-icons/md'

import PublishFileItem from './PublishFileItem'
import PublishQuoteItem from './PublishQuoteItem'
import PublishTagItem from './PublishTagItem'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { FLASH_DURATION_MS } from '../../lib/AppConst'
import { setFlashNoticeMessage } from '../../store/slices/CommonSlice'
import { setPublishFlag } from '../../store/slices/MessengerSlice'
import { BulletinFileAdd, BulletinTagAdd, PublishBulletin } from '../../store/sagas/messenger.actions'

const BulletinPublish = ({ }) => {
  const [tag, setTag] = useState('')
  const textareaRef = useRef(null)

  const [tmpBulletin, setTmpBulletin] = useLocalStorage('TmpBulletin', '')
  const { CurrentBulletinSequence, PublishTagList, PublishQuoteList, PublishFileList } = useSelector(state => state.Messenger)
  const dispatch = useDispatch()

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEscapeKey(() => dispatch(setPublishFlag(false)))

  const handleTmpBulletin = (value) => {
    if (value.trim() !== '') {
      setTmpBulletin(value)
    } else {
      setTmpBulletin('')
    }
  }

  const browseFile = async () => {
    const file_path = await open({
      multiple: false,
      directory: false,
    })
    if (file_path) {
      dispatch(BulletinFileAdd({ file_path }))
    }
  }

  const publish = async () => {
    if (tmpBulletin !== '') {
      let payload = {
        content: tmpBulletin
      }
      dispatch(PublishBulletin(payload))

      // reset
      setTmpBulletin('')
      dispatch(setPublishFlag(false))
    } else {
      dispatch(setFlashNoticeMessage({ message: 'content is empty...', duration: FLASH_DURATION_MS }))
    }
  }

  const addTag = (text) => {
    // Split by commas, trim each, filter empties
    const tag_list = text.split(',').map(t => t.trim()).filter(t => t !== '')
    if (tag_list.length > 0) {
      dispatch(BulletinTagAdd({ tag_list }))
      setTag('')
    }
  }

  const handleTagChange = (e) => {
    const value = e.target.value
    setTag(value)
    // Only auto-add when text ends with a comma (preserves original behavior)
    if (value.endsWith(',')) {
      addTag(value)
    }
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(tag)
    }
  }

  return (
    <div className={`modal-overlay`}>
      <div className="max-w-3xl w-full mx-4 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="modal-header-bar">
          <span className={`label text-base`}>
            {`Bulletin #${CurrentBulletinSequence + 1}`}
          </span>
          <button onClick={() => dispatch(setPublishFlag(false))} className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors" aria-label="Close">
            <IoCloseOutline className="text-lg text-text-secondary dark:text-dark-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="modal-content-area">

          {/* Textarea with file button */}
          <div className="relative">
            <textarea ref={textareaRef} type={"text"}
              id="new-bulletin-textarea"
              name={'New Bulletin:'}
              value={tmpBulletin}
              rows="8"
              onChange={(e) => handleTmpBulletin(e.target.value)}
              className={`w-full p-3 border rounded-lg shadow-sm appearance-none input-color input-hover resize-none`}
              placeholder={"Write your bulletin..."}
            />
            <div className="absolute bottom-2 right-3 text-xs text-text-secondary/60 dark:text-dark-text-secondary/60">
              {tmpBulletin.length} chars
            </div>
          </div>

          {/* Action bar: file attach */}
          <div className="mt-2 flex items-center gap-2">
          <button onClick={() => browseFile()} className="btn-sm bg-primary/10 hover:bg-primary/20 dark:bg-primary/20 dark:hover:bg-primary/30 text-text-primary dark:text-dark-text-primary border border-primary/20 dark:border-primary/30">
              <IoAttachSharp className="text-base" />
              Attach file
            </button>
          </div>

          {/* Tag input */}
          <div className="mt-3 flex flex-col gap-1">
            <span className={`label text-sm`}>Tags (Enter to add)</span>
            <input type="text"
              id="bulletin-tag-input"
              name={'Tag:'}
              placeholder={','}
              value={tag}
              onChange={handleTagChange}
              onKeyDown={handleTagKeyDown}
              className={`w-full px-3 py-2 border rounded-lg shadow-sm appearance-none input-hover input-color`}
            />
          </div>

          {/* Attached sections */}
          {PublishTagList.length > 0 && (
            <div className="mt-3">
              <span className={`label text-xs`}>Tags</span>
              <div className='flex flex-wrap mt-1'>
                {PublishTagList.map((t) => (
                  <div key={t} className='mt-1 px-1'>
                    <PublishTagItem tag={t} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {PublishQuoteList.length > 0 && (
            <div className="mt-3">
              <span className={`label text-xs`}>Quotes</span>
              <div className='flex flex-wrap mt-1'>
                {PublishQuoteList.map((quote) => (
                  <div key={quote.Hash} className='mt-1 px-1'>
                    <PublishQuoteItem address={quote.Address} sequence={quote.Sequence} hash={quote.Hash} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {PublishFileList.length > 0 && (
            <div className="mt-3">
              <span className={`label text-xs`}>Attachments</span>
              <div className='flex flex-wrap mt-1'>
                {PublishFileList.map((file) => (
                  <div key={file.Hash} className='mt-1 px-1'>
                    <PublishFileItem name={file.Name} ext={file.Ext} size={file.Size} hash={file.Hash} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-primary/20 dark:border-primary/30 rounded-b-xl bg-surface dark:bg-dark-surface shadow-lg">
          <button onClick={() => dispatch(setPublishFlag(false))} className="btn-sm hover:bg-primary/10 dark:hover:bg-primary/20 text-text-secondary dark:text-dark-text-secondary border border-primary/20 dark:border-primary/30">
            Cancel
          </button>
          <button onClick={() => publish()} className="btn-sm btn-gold flex items-center gap-1">
            <MdPublish className="inline mr-1" /> Publish
          </button>
        </div>
      </div>
    </div>
  )
}

export default BulletinPublish
