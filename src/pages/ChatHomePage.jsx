import { useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { open } from '@tauri-apps/plugin-dialog'
import { FiMessageSquare } from 'react-icons/fi'
import { GrGroup } from 'react-icons/gr'

import AvatarName from '../components/AvatarName'
import ChatInput from '../components/Chat/ChatInput'
import ListSession from '../components/Chat/ListSession'
import MessageCard from '../components/Chat/MessageCard'
import SessionName from '../components/Chat/SessionName'
import EmptyState from '../components/EmptyState'
import ErrorBoundary from '../components/ErrorBoundary'
import { FLASH_DURATION_MS, SessionType } from '../lib/AppConst'
import { setFlashNoticeMessage } from '../store/slices/CommonSlice'
import { LoadCurrentSession, LoadSessionList, SendContent, SendFile } from '../store/sagas/messenger.actions'
import AvatarImage from '../components/AvatarImage'

export default function ChatHomePage() {
  const containerRef = useRef(null)
  const dispatch = useDispatch()
  const { SessionList, CurrentSession, CurrentSessionMessageList } = useSelector(state => state.Messenger)

  useEffect(() => {
    dispatch(LoadSessionList())
  }, [dispatch])

  useEffect(() => {
    if (containerRef.current) {
      requestAnimationFrame(() => { containerRef.current.scrollTop = containerRef.current.scrollHeight })
    }
  }, [CurrentSessionMessageList.length])

  const send = useCallback((content) => {
    if (content !== '') {
      dispatch(SendContent({ content }))
    } else {
      dispatch(setFlashNoticeMessage({ message: 'content is empty...', duration: FLASH_DURATION_MS }))
    }
  }, [dispatch])

  const browseFile = useCallback(async () => {
    const file_path = await open({ multiple: false, directory: false })
    if (file_path) {
      dispatch(SendFile({ file_path }))
    }
  }, [dispatch])

  const handleSessionClick = useCallback((session) => {
    dispatch(LoadCurrentSession(session))
  }, [dispatch])

  return (
    <div className="p-4 mt-2 rounded-xl bg-gradient-card dark:bg-dark-gradient-card border border-primary/20 dark:border-primary/30 overflow-hidden h-full flex flex-row">
      <ErrorBoundary fallbackTitle="Chat Error">
        {/* Left — session list */}
        <div className='w-1/4 h-full flex flex-col border-r border-primary/10 dark:border-primary/20 pr-3'>
          <div className="overflow-y-auto flex-1">
            {SessionList.length === 0 ? (
              <EmptyState
                icon={<FiMessageSquare className="text-4xl text-primary/30 dark:text-dark-primary/30 mb-2" />}
                title="No sessions yet"
                description="Start a conversation with a contact"
                className="my-6"
              />
            ) : (
              SessionList.map((session) => (
                <ListSession key={session.address || session.hash || session.remote} session={session} onClick={() => handleSessionClick(session)} />
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
                  <AvatarImage address={CurrentSession.remote} classNames={'avatar-sm'} />
                  <AvatarName address={CurrentSession.remote} />
                </div>
                {/* Messages — fills remaining, scrolls when too tall */}
                <div ref={containerRef} id='MessageListContainer' className="min-h-[50vh] max-h-[65vh] overflow-y-auto py-2">
                  {CurrentSessionMessageList.length > 0 ? (
                    CurrentSessionMessageList.map((msg) => (
                      <MessageCard key={msg.hash} message={msg} mode="private" className="mt-1" />
                    ))
                  ) : (
                    <EmptyState
                      icon={<FiMessageSquare className="text-4xl text-primary/30 dark:text-dark-primary/30 mb-2" />}
                      title="No messages yet"
                      className="h-full"
                    />
                  )}
                </div>
                {/* Input bar — pinned at bottom, never shrinks */}
                {CurrentSession.aes_key !== undefined ? (
                  <ChatInput onSend={send} onAttach={browseFile} />
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
                <div ref={containerRef} id='MessageListContainer' className="min-h-[50vh] max-h-[65vh] overflow-y-auto py-2">
                  {CurrentSessionMessageList.length > 0 ? (
                    CurrentSessionMessageList.map((msg) => (
                      <MessageCard key={msg.hash} message={msg} mode="group" className="mt-1" />
                    ))
                  ) : (
                    <EmptyState
                      icon={<FiMessageSquare className="text-4xl text-primary/30 dark:text-dark-primary/30 mb-2" />}
                      title="No messages yet"
                      className="h-full"
                    />
                  )}
                </div>
                <ChatInput onSend={send} onAttach={browseFile} />
              </div>
            )
          ) : (
            <EmptyState
              icon={<FiMessageSquare className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
              title="Select a session"
              className="flex flex-col items-center justify-center h-full"
            />
          )}
        </div>
      </ErrorBoundary>
    </div>
  )
}
