import { useDispatch, useSelector } from 'react-redux'
import { IoCloseOutline } from "react-icons/io5"
import { setForwardFlag } from '../../store/slices/MessengerSlice'
import AvatarName from '../AvatarName'
import AvatarImage from '../AvatarImage'

const BulletinForward = ({ }) => {

  const { FriendList } = useSelector(state => state.User)
  const { ForwardBulletin } = useSelector(state => state.Messenger)
  const dispatch = useDispatch()

  const forward = async (friend) => {
    dispatch({
      type: 'ForwardBulletin',
      payload: {
        friend: friend
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
          FriendList.length > 0 ?
            <div className='flex flex-wrap'>
              {
                FriendList.map((friend, index) => (
                  <div key={friend} className='mt-1 px-1 flex flex-col justify-center items-center' onClick={() => forward(friend)}>
                    <AvatarImage address={friend} timestamp={Date.now()} style={'avatar'} />
                    <AvatarName address={friend} />
                  </div>
                ))
              }
            </div>
            :
            <div>
              no friend yet...
            </div>
        }
      </div>
    </div>
  )
}

export default BulletinForward