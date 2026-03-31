import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { IoCloseOutline } from "react-icons/io5"
import { setPasteFlag, setPublishFlag } from '../../store/slices/MessengerSlice'
import { setFlashNoticeMessage } from '../../store/slices/CommonSlice'
import { checkBulletinSchema } from '../../lib/MessageSchemaVerifier'
import { VerifyJsonSignature } from '../../lib/MessengerUtil'

const BulletinPaste = ({ }) => {

  const [tmpBulletin, setTmpBulletin] = useState('')
  const [tmpError, setTmpError] = useState('')
  const dispatch = useDispatch()

  const checkBulletin = async (value) => {
    setTmpBulletin(value)
    setTmpError('')
    try {
      let json = JSON.parse(value)
      if (checkBulletinSchema(json)) {
        if (VerifyJsonSignature(json)) {
          setTmpBulletin('')
          dispatch({
            type: 'UploadBulletin',
            payload: {
              json: json
            }
          })
          dispatch(setFlashNoticeMessage({ message: 'bulletin saved success', duration: 3000 }))
          dispatch(setPasteFlag(false))
        } else {
          setTmpError('signature invalid...')
        }
      } else {
        setTmpError('schema invalid...')
      }
    } catch (error) {
      setTmpError('not a json...')
    }
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-5 backdrop-blur-sm`}>
      <div className="flex flex-row items-center justify-center">
        <button onClick={() => dispatch(setPasteFlag(false))} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
          <IoCloseOutline className='icon' /> cancel
        </button>
      </div>
      <div className="max-w-7xl overflow-x-auto overflow-y-auto whitespace-normal break-words p-2 rounded-xl shadow-2xl items-center">
        <div className="min-w-full p-2 flex gap-1 rounded-lg shadow-xl justify-center">
          <div className={`mt-1 flex flex-col flex-1 p-2`}>
            <textarea type={"text"}
              id={`${'New Bulletin:' + Math.random()}`}
              name={'New Bulletin:'}
              value={tmpBulletin}
              placeholder='paste bulletin json here'
              rows="6"
              onChange={(e) => checkBulletin(e.target.value)}
              className={`p-2 border rounded shadow-xl appearance-none input-color`}
            />
            {
              tmpError !== '' &&
              <span className={`lable`}>
                {tmpError}
              </span>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

export default BulletinPaste