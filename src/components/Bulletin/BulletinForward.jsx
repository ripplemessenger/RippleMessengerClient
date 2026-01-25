import { useDispatch, useSelector } from 'react-redux'
import { IoCloseOutline } from "react-icons/io5"
import { setForwardFlag } from '../../store/slices/MessengerSlice'
import ListSession from '../Chat/ListSession'

const BulletinForward = ({ }) => {

  const { SessionList } = useSelector(state => state.Messenger)
  const dispatch = useDispatch()

  const forward = async (session) => {
    dispatch({
      type: 'ForwardBulletin',
      payload: {
        session: session
      }
    })
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-5 backdrop-blur-sm`}>
      <div className="flex flex-row items-center justify-center">
        <button onClick={() => dispatch(setForwardFlag(false))} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
          <IoCloseOutline className='icon' /> cancel
        </button>
      </div>
      <div className="max-w-7xl overflow-x-auto overflow-y-auto whitespace-normal break-words p-2 rounded-xl shadow-2xl items-center">
        {
          SessionList.length > 0 ?
            <div className='flex flex-wrap'>
              {
                SessionList.map((session, index) => (
                  <div key={index} className='text-xs text-gray-200 mt-1 p-1'>
                    <ListSession session={session} onClick={() => forward(session)} />
                  </div>
                ))
              }
            </div>
            :
            <div>
              no session yet...
            </div>
        }
      </div>
    </div>
  )
}

export default BulletinForward