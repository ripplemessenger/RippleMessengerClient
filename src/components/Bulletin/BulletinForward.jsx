import { memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { IoCloseOutline } from "react-icons/io5"
import { ForwardBulletin } from '../../store/sagas/messenger.actions'
import { setForwardFlag } from '../../store/slices/MessengerSlice'
import ListSession from '../Chat/ListSession'

const BulletinForward = ({ }) => {

  const { SessionList } = useSelector(state => state.Messenger)
  const dispatch = useDispatch()

  const forward = (session) => {
    dispatch(ForwardBulletin({
      session: session
    }))
  }

  return (
    <div className={`modal-overlay`} role="dialog" aria-modal="true">
      <div className="modal-action-row">
        <button onClick={() => dispatch(setForwardFlag(false))} className="modal-btn-gray">
          <IoCloseOutline className='icon' /> cancel
        </button>
      </div>
      <div className="modal-content-wrapper">
        {
          SessionList.length > 0 ?
            <div className='flex flex-wrap'>
              {
                SessionList.map((session) => (
                  <div key={`${session.type}-${session.address || session.name}`} className='text-xs text-text-primary dark:text-dark-text-primary mt-1 p-1'>
                    <ListSession session={session} onSessionClick={forward} />
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

export default memo(BulletinForward)