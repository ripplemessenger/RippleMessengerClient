import { memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { IoCloseOutline } from "react-icons/io5"
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { ForwardBulletin } from '../../store/sagas/messenger.actions'
import { setForwardFlag } from '../../store/slices/MessengerSlice'
import ListSession from '../Chat/ListSession'
import EmptyState from '../EmptyState'
import { selectChatSessions } from '../../selectors'

const BulletinForward = ({ }) => {

  const sessionList = useSelector(selectChatSessions)
  const dispatch = useDispatch()

  useEscapeKey(() => dispatch(setForwardFlag(false)))

  const forward = (session) => {
    dispatch(ForwardBulletin({
      session: session
    }))
  }

  return (
    <div className={`modal-overlay`} role="dialog" aria-modal="true">
      <div className="max-w-md w-full mx-4 flex flex-col">
        <div className="modal-header-bar">
          <span className={`label text-base`}>Forward Bulletin</span>
          <button onClick={() => dispatch(setForwardFlag(false))} className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors" aria-label="Close">
            <IoCloseOutline className="text-lg text-text-secondary dark:text-dark-text-secondary" />
          </button>
        </div>
        <div className="modal-content-area">
        {
          sessionList.length > 0 ?
            <div className='flex flex-wrap'>
              {
                sessionList.map((session) => (
                  <div key={`${session.type}-${session.address || session.name}`} className='text-xs text-text-primary dark:text-dark-text-primary mt-1 p-1'>
                    <ListSession session={session} onSessionClick={forward} />
                  </div>
                ))
              }
            </div>
            :
            <EmptyState
              title="No sessions"
              description="Start a chat to forward bulletins"
            />
        }
        </div>
      </div>
    </div>
  )
}

export default memo(BulletinForward)