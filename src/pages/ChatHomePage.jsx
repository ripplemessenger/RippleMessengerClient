import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { open } from '@tauri-apps/plugin-dialog'
import { FiMessageSquare } from 'react-icons/fi'

import AvatarImage from '../components/AvatarImage'
import AvatarName from '../components/AvatarName'
import ChatInput from '../components/Chat/ChatInput'
import ListSession from '../components/Chat/ListSession'
import MessageCard from '../components/Chat/MessageCard'
import SessionName from '../components/Chat/SessionName'
import EmptyState from '../components/EmptyState'
import ErrorBoundary from '../components/ErrorBoundary'
import { selectChatSessions, selectCurrentSession, selectCurrentSessionMessages, selectUserAddress } from '../selectors'
import { FLASH_DURATION_MS, SessionType } from '../lib/AppConst'
import { setFlashNoticeMessage } from '../store/slices/CommonSlice'
import { LoadCurrentSession, LoadSessionList, SendContent, SendFile } from '../store/sagas/messenger.actions'

export default function ChatHomePage() {
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const dispatch = useDispatch()
  const SessionList = useSelector(selectChatSessions)
  const CurrentSession = useSelector(selectCurrentSession)
  const CurrentSessionMessageList = useSelector(selectCurrentSessionMessages)
  const GroupList = useSelector((state) => state.Messenger.GroupList)
  const Address = useSelector(selectUserAddress)

  // Last message (per side) that the other party has confirmed, for private chat read-receipt highlight.
  // Derived from the stored message JSON (no extra DB field needed):
  //   - A→B message's is_confirmed      = B confirmed A's message  → "remote" (A's last confirmed)
  //   - A→B message's json.Confirm.Seq  = A confirmed B's message  → "self"   (B's last confirmed)
  const lastConfirmedSeqs = useMemo(() => {
    let self = 0
    let remote = 0
    for (const m of CurrentSessionMessageList || []) {
      if (m.sour === Address) continue // only A→B messages carry the confirmation info
      if (m.is_confirmed && m.sequence > remote) remote = m.sequence
      const cseq = m.json && m.json.Confirm ? m.json.Confirm.Sequence : 0
      if (cseq && cseq > self) self = cseq
    }
    return { self, remote }
  }, [CurrentSessionMessageList, Address])

  // Deleted group: keep history viewable, block sending
  const groupDeleted =
    CurrentSession && CurrentSession.type === SessionType.Group
      ? GroupList.some((g) => g.hash === CurrentSession.hash && g.delete_json !== null)
      : false

  // Group owner first, larger avatar; other members after
  const groupOwnerAddr = useMemo(() => {
    if (!CurrentSession || CurrentSession.type !== SessionType.Group) return null
    const g = GroupList.find((g) => g.hash === CurrentSession.hash)
    return g?.created_by || null
  }, [CurrentSession, GroupList])

  const sortedGroupMembers = useMemo(() => {
    if (!CurrentSession?.member || groupOwnerAddr === null) return CurrentSession?.member || []
    return [groupOwnerAddr, ...CurrentSession.member.filter((m) => m !== groupOwnerAddr)]
  }, [CurrentSession, groupOwnerAddr])

  useEffect(() => {
    dispatch(LoadSessionList())
  }, [dispatch])

  // Auto-scroll to bottom: on content resize, image load, or message count change.
  // Only scrolls if user is already near the bottom (don't yank back while reading history).
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let isNearBottom = true

    const handleScroll = () => {
      isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80
    }

    const scrollToBottom = () => {
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight
      }
    }

    // Fires when container's rendered size changes (content growth up to max-height)
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(scrollToBottom)
    })
    resizeObserver.observe(container)

    // Fires when child images finish loading (height change after container hits max-height)
    const handleLoad = () => requestAnimationFrame(scrollToBottom)
    container.addEventListener('load', handleLoad, true)

    container.addEventListener('scroll', handleScroll)

    return () => {
      resizeObserver.disconnect()
      container.removeEventListener('load', handleLoad, true)
      container.removeEventListener('scroll', handleScroll)
    }
  }, [CurrentSession])

  const send = useCallback(
    (content) => {
      if (content !== '') {
        dispatch(SendContent({ content }))
      } else {
        dispatch(setFlashNoticeMessage({ message: t('chat.content_empty'), duration: FLASH_DURATION_MS }))
      }
    },
    [dispatch]
  )

  const browseFile = useCallback(async () => {
    const file_path = await open({ multiple: false, directory: false })
    if (file_path) {
      dispatch(SendFile({ file_path }))
    }
  }, [dispatch])

  const handleSessionClick = useCallback(
    (session) => {
      dispatch(LoadCurrentSession(session))
    },
    [dispatch]
  )

  return (
    <div className="p-4 mt-2 rounded-xl bg-gradient-card dark:bg-dark-gradient-card border border-primary/20 dark:border-primary/30 overflow-hidden h-full flex flex-row">
      <ErrorBoundary fallbackTitle="Chat Error">
        {/* Left — session list */}
        <div className="w-1/4 h-full flex flex-col border-r border-primary/10 dark:border-primary/20 pr-3">
          <div className="overflow-y-auto flex-1">
            {SessionList.length === 0 ? (
              <EmptyState
                icon={<FiMessageSquare className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
                title={t('ui.no_sessions')}
                description={t('ui.start_conversation')}
                className="my-6"
              />
            ) : (
              SessionList.map((session) => (
                <ListSession
                  key={session.address || session.hash || session.remote}
                  session={session}
                  onSessionClick={handleSessionClick}
                />
              ))
            )}
          </div>
        </div>

        {/* Right — chat area */}
        <div className="w-3/4 h-full flex flex-col pl-4 min-w-0">
          {CurrentSession ? (
            CurrentSession.type === SessionType.Private ? (
              <div className="flex flex-col h-full">
                {/* Title bar */}
                <div className="card-title flex flex-row items-center shrink-0">
                  <AvatarImage address={CurrentSession.remote} classNames={'avatar-sm'} />
                  <AvatarName address={CurrentSession.remote} />
                </div>
                {/* Messages — fills remaining, scrolls when too tall */}
                <div
                  ref={containerRef}
                  id="MessageListContainer"
                  className="min-h-[50vh] max-h-[65vh] overflow-y-auto py-2 gap-1 flex flex-col"
                >
                  {CurrentSessionMessageList.length > 0 ? (
                    CurrentSessionMessageList.map((msg) => {
                      const isSelf = msg.sour === Address
                      const isLastConfirmed = isSelf
                        ? msg.sequence === lastConfirmedSeqs.self && lastConfirmedSeqs.self > 0
                        : msg.sequence === lastConfirmedSeqs.remote && lastConfirmedSeqs.remote > 0
                      return (
                        <MessageCard key={msg.hash} message={msg} mode="private" isLastConfirmed={isLastConfirmed} />
                      )
                    })
                  ) : (
                    <EmptyState
                      icon={<FiMessageSquare className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
                      title={t('ui.no_messages')}
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
                <div className="card-title flex flex-row items-center shrink-0 gap-1" title={CurrentSession.hash}>
                  <SessionName name={CurrentSession.name} />
                  {sortedGroupMembers && sortedGroupMembers.length > 0 && (
                    <div className="flex items-center ml-auto gap-0.5">
                      {sortedGroupMembers.map((memberAddr) => (
                        <div key={memberAddr} className="group relative">
                          <AvatarImage
                            address={memberAddr}
                            classNames={memberAddr === groupOwnerAddr ? 'avatar-sm' : 'avatar-xs'}
                            onClick={() => {
                              navigator.clipboard.writeText(memberAddr)
                              dispatch(
                                setFlashNoticeMessage({
                                  message: `${t('ui.copied_to_clipboard')} ${memberAddr.slice(0, 8)}...`,
                                  duration: FLASH_DURATION_MS
                                })
                              )
                            }}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs rounded bg-black/80 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                            {memberAddr}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div
                  ref={containerRef}
                  id="MessageListContainer"
                  className="min-h-[50vh] max-h-[65vh] overflow-y-auto py-2 gap-1 flex flex-col"
                >
                  {CurrentSessionMessageList.length > 0 ? (
                    CurrentSessionMessageList.map((msg) => <MessageCard key={msg.hash} message={msg} mode="group" />)
                  ) : (
                    <EmptyState
                      icon={<FiMessageSquare className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
                      title={t('ui.no_messages')}
                      className="h-full"
                    />
                  )}
                </div>
                {groupDeleted ? (
                  <div className="shrink-0 flex items-center justify-center py-4 text-text-secondary dark:text-dark-text-secondary text-sm italic">
                    {t('group.deleted')}
                  </div>
                ) : (
                  <ChatInput onSend={send} onAttach={browseFile} />
                )}
              </div>
            )
          ) : (
            <EmptyState
              icon={<FiMessageSquare className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
              title={t('ui.never_talk')}
              className="flex flex-col items-center justify-center h-full"
            />
          )}
        </div>
      </ErrorBoundary>
    </div>
  )
}
