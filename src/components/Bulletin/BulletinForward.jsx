import { memo, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { IoCloseOutline } from 'react-icons/io5'
import { useTranslation } from 'react-i18next'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { ForwardBulletin } from '../../store/sagas/messenger.actions'
import { setForwardFlag } from '../../store/slices/MessengerSlice'
import ListSession from '../Chat/ListSession'
import EmptyState from '../EmptyState'
import { selectChatSessions } from '../../selectors'
import { SessionType } from '../../lib/AppConst'

const BulletinForward = ({}) => {
  const { t } = useTranslation()
  const sessionList = useSelector(selectChatSessions)
  const groupList = useSelector((state) => state.Messenger.GroupList)
  const dispatch = useDispatch()
  const dialogRef = useRef(null)

  useEscapeKey(() => dispatch(setForwardFlag(false)))
  useFocusTrap(dialogRef)

  // Exclude deleted groups from the forwarding list (history viewing is unaffected)
  const forwardableSessions = sessionList.filter((session) => {
    if (session.type !== SessionType.Group) return true
    const group = groupList.find((g) => g.hash === session.hash)
    return !group || group.delete_json === null
  })

  const forward = (session) => {
    dispatch(
      ForwardBulletin({
        session: session
      })
    )
  }

  return (
    <div className={`modal-overlay`} role="dialog" aria-modal="true">
      <div ref={dialogRef} className="max-w-md w-full mx-4 flex flex-col">
        <div className="modal-header-bar">
          <span className={`label text-base`}>Forward Bulletin</span>
          <button
            onClick={() => dispatch(setForwardFlag(false))}
            className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
            aria-label={t('common.close')}
          >
            <IoCloseOutline className="text-lg text-text-secondary dark:text-dark-text-secondary" />
          </button>
        </div>
        <div className="modal-content-area">
          {forwardableSessions.length > 0 ? (
            <div className="flex flex-wrap">
              {forwardableSessions.map((session) => (
                <div
                  key={`${session.type}-${session.address || session.name}`}
                  className="text-xs text-text-primary dark:text-dark-text-primary mt-1 p-1"
                >
                  <ListSession session={session} onSessionClick={forward} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title={t('ui.no_sessions')} description={t('ui.start_conversation')} />
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(BulletinForward)
