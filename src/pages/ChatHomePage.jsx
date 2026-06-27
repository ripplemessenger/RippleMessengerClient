import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { open } from '@tauri-apps/plugin-dialog'
import ListSession from '../components/Chat/ListSession'
import AvatarName from '../components/AvatarName'
import SessionName from '../components/Chat/SessionName'
import MessageCard from '../components/Chat/MessageCard'
import { GrGroup } from 'react-icons/gr'
import { IoSendOutline, IoAttachOutline } from 'react-icons/io5'
import { FiMessageSquare } from 'react-icons/fi'
import { SessionType } from '../lib/AppConst'
import { setFlashNoticeMessage } from '../store/slices/CommonSlice'

export default function ChatHomePage() {
  const [message, setMessage] = useState('')
  const dispatch = useDispatch()
  const { SessionList, CurrentSession, CurrentSessionMessageList } = useSelector(state => state.Messenger)

  useEffect(() => {
    dispatch({ type: 'LoadSessionList' })
  }, [dispatch])

  useEffect(() => {
    let el = document.getElementById('MessageListContainer')
    if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
  }, [CurrentSessionMessageList])

  const send = async () => {
    if (message !== '') {
      dispatch({ type: 'SendContent', payload: { content: message } })
      setMessage('')
    } else {
      dispatch(setFlashNoticeMessage({ message: 'content is empty...', duration: 3000 }))
    }
  }

  const browseFile = async () => {
    const file_path = await open({ multiple: false, directory: false })
    if (file_path) {
      dispatch({ type: 'SendFile', payload: { file_path } })
    }
  }

  return (
    <div className="p-4 mt-2 rounded-xl bg-gradient-card dark:bg-dark-gradient-card border border-primary/20 dark:border-primary/30 overflow-hidden h-full flex flex-row">
      {/* Left — session list */}
      <div className='w-1/4 h-full flex flex-col border-r border-primary/10 dark:border-primary/20 pr-3'>
        <div className="overflow-y-auto" style={{ flex: 1 }}>
          {SessionList.length === 0 ? (
            <div className="empty-state-box my-6">
              <FiMessageSquare className="text-4xl text-primary/30 dark:text-dark-primary/30 mb-2" />
              <h3 className='text-lg font-medium text-text-secondary dark:text-dark-text-secondary'>No sessions yet</h3>
              <p className="text-sm text-text-secondary/60 dark:text-dark-text-secondary/60 mt-1">Start a conversation with a contact</p>
            </div>
          ) : (
            SessionList.map((session) => (
              <ListSession key={session.remote} session={session} onClick={() => dispatch({ type: 'LoadCurrentSession', payload: session })} />
            ))
          )}
        </div>
      </div>

      {/* Right — chat area */}
      <div className='w-3/4 h-full flex flex-col pl-4 min-w-0'>
        {CurrentSession ? (
          CurrentSession.type === SessionType.Private ? (
            <div className="flex flex-col h-full">
              {/* Title bar */}
              <div className="card-title flex flex-row items-center shrink-0">
                <AvatarName address={CurrentSession.remote} />
              </div>
              {/* Messages — fills remaining, scrolls when too tall */}
              <div id='MessageListContainer' className="min-h-[50vh] max-h-[65vh] overflow-y-auto py-2">
                {CurrentSessionMessageList.length > 0 ? (
                  CurrentSessionMessageList.map((msg) => (
                    <MessageCard key={msg.hash} message={msg} mode="private" className="mt-1" />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-text-secondary/60 dark:text-dark-text-secondary/60">
                    <FiMessageSquare className="text-4xl mb-2" />
                    <p className="text-sm">No messages yet</p>
                  </div>
                )}
              </div>
              {/* Input bar — pinned at bottom, never shrinks */}
              {CurrentSession.aes_key !== undefined ? (
                <div className="shrink-0 mt-3 flex items-end gap-3">
                  <textarea
                    value={message}
                    rows={3}
                    onChange={(e) => setMessage(e.target.value)}
                    className="p-3 w-full border rounded-lg shadow-sm appearance-none input-color input-hover resize-none"
                    placeholder="Type a message..."
                  />
                  <div className="flex flex-col gap-2">
                    <button onClick={browseFile} className="p-3 rounded-lg text-text-secondary dark:text-dark-text-secondary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors shadow-sm" title="Send file">
                      <IoAttachOutline className="text-xl" />
                    </button>
                    <button onClick={send} className="p-3 rounded-lg text-white bg-primary hover:bg-primary-dark transition-all shadow-gold hover:shadow-gold-lg active:scale-95" title="Send message">
                      <IoSendOutline className="text-xl" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="shrink-0 flex items-center justify-center py-4 text-text-secondary dark:text-dark-text-secondary text-sm italic">
                  Handshake not ready...
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="card-title flex flex-row items-center shrink-0" title={CurrentSession.hash}>
                <GrGroup className="session-icon" />
                <SessionName name={CurrentSession.name} />
              </div>
              <div id='MessageListContainer' className="min-h-[50vh] max-h-[65vh] overflow-y-auto py-2">
                {CurrentSessionMessageList.length > 0 ? (
                  CurrentSessionMessageList.map((msg) => (
                    <MessageCard key={msg.hash} message={msg} mode="group" className="mt-1" />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-text-secondary/60 dark:text-dark-text-secondary/60">
                    <FiMessageSquare className="text-4xl mb-2" />
                    <p className="text-sm">No messages yet</p>
                  </div>
                )}
              </div>
              <div className="shrink-0 mt-3 flex items-end gap-3">
                <textarea
                  value={message}
                  rows={3}
                  onChange={(e) => setMessage(e.target.value)}
                  className="p-3 w-full border rounded-lg shadow-sm appearance-none input-color input-hover resize-none"
                  placeholder="Type a message..."
                />
                <div className="flex flex-col gap-2">
                  <button onClick={browseFile} className="p-3 rounded-lg text-text-secondary dark:text-dark-text-secondary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors shadow-sm" title="Send file">
                    <IoAttachOutline className="text-xl" />
                  </button>
                  <button onClick={send} className="p-3 rounded-lg text-white bg-primary hover:bg-primary-dark transition-all shadow-gold hover:shadow-gold-lg active:scale-95" title="Send message">
                    <IoSendOutline className="text-xl" />
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="empty-state-box flex flex-col items-center justify-center h-full">
            <FiMessageSquare className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />
            <h3 className='text-lg font-medium text-text-secondary dark:text-dark-text-secondary'>Select a session</h3>
          </div>
        )}
      </div>
    </div >
  )
}
