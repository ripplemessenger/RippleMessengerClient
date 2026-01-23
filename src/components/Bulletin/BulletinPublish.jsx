import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { open, save } from '@tauri-apps/plugin-dialog'
import { MdPublish } from "react-icons/md"
import { IoAttachSharp, IoCloseOutline } from "react-icons/io5"
import { setPublishFlag } from '../../store/slices/MessengerSlice'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { setFlashNoticeMessage } from '../../store/slices/UserSlice'
import PublishQuoteItem from './PublishQuoteItem'
import PublishFileItem from './PublishFileItem'
import TextInput from '../Form/TextInput'
import PublishTagItem from './PublishTagItem'
import { trimEndCommasAndValidate } from '../../lib/MessengerUtil'

const BulletinPublish = ({ }) => {
  const [tag, setTag] = useState('')

  const [tmpBulletin, setTmpBulletin] = useLocalStorage('TmpBulletin', '')
  const { CurrentBulletinSequence, PublishTagList, PublishQuoteList, PublishFileList } = useSelector(state => state.Messenger)
  const dispatch = useDispatch()

  const handelTmpBulletin = (value) => {
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
      dispatch({
        type: 'BulletinFileAdd', payload: {
          file_path: file_path
        }
      })
    }
  }

  const publish = async () => {
    if (tmpBulletin !== '') {
      let payload = {
        content: tmpBulletin
      }
      dispatch({ type: 'PublishBulletin', payload: payload })

      // reset
      setTmpBulletin('')
      dispatch(setPublishFlag(false))
    } else {
      dispatch(setFlashNoticeMessage({ message: 'content is empty...', duration: 3000 }))
    }
  }

  const checkTag = async (tag) => {
    let result = trimEndCommasAndValidate(tag)
    if (result) {
      dispatch({
        type: 'BulletinTagAdd',
        payload: {
          Tag: result
        }
      })
      setTag('')
    } else {
      setTag(tag)
    }
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-5 backdrop-blur-sm`}>
      <div className="flex flex-row items-center justify-center">
        <button onClick={() => browseFile()} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-yellow-300 hover:bg-gray-200 dark:hover:bg-gray-600">
          <IoAttachSharp className='icon' />file
        </button>
        <button onClick={() => publish()} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-green-300 hover:bg-gray-200 dark:hover:bg-gray-600">
          <MdPublish className='icon' /> publish
        </button>
        <button onClick={() => dispatch(setPublishFlag(false))} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
          <IoCloseOutline className='icon' /> cancel
        </button>
      </div>
      <div className="max-w-7xl overflow-x-auto overflow-y-auto whitespace-normal break-words p-2 rounded-xl shadow-2xl items-center">
        <div className="min-w-full p-2 flex gap-1 rounded-lg shadow-xl justify-center">
          <div className={`mt-1 flex flex-col flex-1 p-2`}>
            <span className={`lable`}>
              {`Bulletin#${CurrentBulletinSequence + 1}:`}
            </span>
            <textarea type={"text"}
              id={`${'New Bulletin:' + Math.random()}`}
              name={'New Bulletin:'}
              value={tmpBulletin}
              rows="6"
              onChange={(e) => handelTmpBulletin(e.target.value)}
              className={`p-2 border rounded shadow-xl appearance-none input-color`}
            />
            <TextInput label={'Tag:'} placeholder={','} value={tag} onChange={(e) => checkTag(e.target.value)} />
            {
              PublishTagList.length > 0 &&
              <div className='flex flex-wrap'>
                {
                  PublishTagList.map((tag, index) => (
                    <div key={tag} className='mt-1 px-1'>
                      <PublishTagItem tag={tag} />
                    </div>
                  ))
                }
              </div>
            }
            {
              PublishQuoteList.length > 0 &&
              <div className='flex flex-wrap'>
                {
                  PublishQuoteList.map((quote, index) => (
                    <div key={quote.Hash} className='mt-1 px-1'>
                      <PublishQuoteItem address={quote.Address} sequence={quote.Sequence} hash={quote.Hash} />
                    </div>
                  ))
                }
              </div>
            }
            {
              PublishFileList.length > 0 &&
              <div className='flex flex-wrap'>
                {
                  PublishFileList.map((file, index) => (
                    <div key={file.Hash} className='mt-1 px-1'>
                      <PublishFileItem name={file.Name} ext={file.Ext} size={file.Size} hash={file.Hash} />
                    </div>
                  ))
                }
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default BulletinPublish