import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import PageList from '../components/PageList'
import TextTimestamp from '../components/TextTimestamp'
import {
  selectChatSessions,
  selectCurrentSession,
  selectCurrentSessionMessages,
  selectUserAddress,
  selectMessageSearchData,
  selectAvatarNameData
} from '../selectors'
import { FLASH_DURATION_MS, SessionType } from '../lib/AppConst'
import { setFlashNoticeMessage } from '../store/slices/CommonSlice'
import {
  LoadCurrentSession,
  LoadSessionList,
  SearchMessages,
  SendContent,
  SendFile
} from '../store/sagas/messenger.actions'

export default function ChatHomePage() {
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const dispatch = useDispatch()
  const SessionList = useSelector(selectChatSessions)
  const CurrentSession = useSelector(selectCurrentSession)
  const CurrentSessionMessageList = useSelector(selectCurrentSessionMessages)
  const GroupList = useSelector((state) => state.Messenger.GroupList)
  const Address = useSelector(selectUserAddress)
  const {
    list: MessageSearchList,
    page: MessageSearchPage,
    totalPage: MessageSearchTotalPage
  } = useSelector(selectMessageSearchData)

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchTimer = useRef(null)

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

  // ==================== Message search ====================

  const runMessageSearch = useCallback(
    (q) => {
      clearTimeout(searchTimer.current)
      searchTimer.current = setTimeout(() => {
        dispatch(SearchMessages({ query: q, page: 1 }))
      }, 300)
    },
    [dispatch]
  )

  const handleSearchInput = (value) => {
    setSearchQuery(value)
    runMessageSearch(value)
  }

  const closeSearch = () => {
    clearTimeout(searchTimer.current)
    setSearchOpen(false)
    setSearchQuery('')
  }

  const isSearching = searchOpen && searchQuery.trim().length > 0

  // Filter session list by search query (private: address + nickname, group: name + members)
  const { ContactMap } = useSelector(selectAvatarNameData)
  const filteredSessionList = useMemo(() => {
    if (!searchQuery.trim()) return SessionList
    const q = searchQuery.trim().toLowerCase()
    return SessionList.filter((session) => {
      if (session.type === SessionType.Private) {
        const nickname = ContactMap[session.address]?.toLowerCase() || ''
        return session.address?.toLowerCase().includes(q) || nickname.includes(q)
      }
      // Group: match name OR any member's address/nickname
      if (session.name?.toLowerCase().includes(q)) return true
      if (session.member) {
        return session.member.some((addr) => {
          const nickname = ContactMap[addr]?.toLowerCase() || ''
          return addr?.toLowerCase().includes(q) || nickname.includes(q)
        })
      }
      return false
    })
  }, [SessionList, searchQuery, ContactMap])

  const handleSearchResultClick = (item) => {
    if (item.msg_type === 'private') {
      dispatch(LoadCurrentSession({ type: SessionType.Private, address: item.peer }))
    } else {
      const g = GroupList.find((group) => group.hash === item.peer)
      if (g) {
        let member = [...g.member]
        member.push(g.created_by)
        member = [...new Set(member)]
        dispatch(LoadCurrentSession({ type: SessionType.Group, hash: g.hash, name: g.name, member }))
      }
    }
    closeSearch()
  }

  const searchResultView = (
    <div className="flex flex-col h-full">
      <div className="card-title flex flex-row items-center shrink-0">{t('ui.search_message')}</div>
      <div className="flex-1 overflow-y-auto py-2 min-h-[50vh]">
        {MessageSearchList.length === 0 ? (
          <EmptyState
            icon={<FiMessageSquare className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
            title={t('ui.no_results')}
            className="h-full"
          />
        ) : (
          <>
            <PageList
              current_page={MessageSearchPage}
              total_page={MessageSearchTotalPage}
              dispatch_type="SearchMessages"
              payload={{ query: searchQuery.trim() }}
            />
            <div className="flex flex-col gap-2 mt-2">
              {MessageSearchList.map((item, i) => (
                <div
                  key={`${item.msg_type}-${item.peer}-${item.signed_at}-${i}`}
                  className="rounded-lg px-3 py-2 cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors border border-primary/10 dark:border-primary/20"
                  onClick={() => handleSearchResultClick(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleSearchResultClick(item)
                  }}
                >
                  <div className="flex flex-row items-center gap-2">
                    {item.msg_type === 'private' ? (
                      <AvatarName address={item.peer} />
                    ) : (
                      <SessionName name={item.peer_name} />
                    )}
                    <span className="text-xs px-1.5 py-0.5 rounded-full border border-primary/30 bg-primary/5 text-primary dark:text-dark-primary">
                      {item.msg_type === 'private' ? t('ui.msg_type_private') : t('ui.msg_type_group')}
                    </span>
                    <span className="ml-auto">
                      <TextTimestamp timestamp={item.signed_at} textSize={'text-xs'} />
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">
                    {item.msg_type === 'private' ? (
                      <AvatarName address={item.sender} short_flag={true} />
                    ) : (
                      <span>
                        {item.sender_name ||
                          item.sender.substring(0, 6) + '...' + item.sender.substring(item.sender.length - 4)}
                      </span>
                    )}
                  </div>
                  <div
                    className="text-sm text-text-primary dark:text-dark-text-primary mt-1 truncate"
                    title={item.content_preview}
                  >
                    {item.content_preview}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="p-4 mt-2 rounded-xl bg-gradient-card dark:bg-dark-gradient-card border border-primary/20 dark:border-primary/30 overflow-hidden h-full flex flex-col">
      {/* Title bar */}
      <div className="card-title flex flex-row items-center mb-1 shrink-0">
        <span className="text-lg font-bold text-text-primary dark:text-dark-text-primary">{t('page.chat')}</span>
        <button
          className={`icon-action-btn ${searchOpen ? 'text-primary dark:text-dark-primary' : ''}`}
          onClick={() => setSearchOpen(!searchOpen)}
          aria-label={t('ui.search_message')}
          title={t('ui.search_message')}
        >
          <svg className="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Search input (when open) */}
      {searchOpen && (
        <div className="mb-2 shrink-0 flex justify-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder={t('ui.search_chat')}
            className="w-1/3 px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-900 border-primary/20 dark:border-primary/30 text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
            autoFocus
          />
        </div>
      )}

      <ErrorBoundary fallbackTitle={t('chat.error_title')}>
        {/* Two-column layout */}
        <div className="flex flex-row w-full flex-1 min-h-0">
          {/* Left — session list */}
          <div className="w-1/4 h-full flex flex-col border-r border-primary/10 dark:border-primary/20 pr-3">
            <div className="overflow-y-auto flex-1">
              {filteredSessionList.length === 0 ? (
                <EmptyState
                  icon={<FiMessageSquare className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
                  title={searchQuery.trim() ? t('ui.no_results') : t('ui.no_sessions')}
                  description={searchQuery.trim() ? undefined : t('ui.start_conversation')}
                  className="my-6"
                />
              ) : (
                filteredSessionList.map((session) => (
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
            {isSearching ? (
              searchResultView
            ) : CurrentSession ? (
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
                          ? msg.sequence <= lastConfirmedSeqs.self && lastConfirmedSeqs.self > 0
                          : msg.sequence <= lastConfirmedSeqs.remote && lastConfirmedSeqs.remote > 0
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
                      {t('chat.handshake_not_ready')}
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
                                    message: `${t('common.copied_to_clipboard')} ${memberAddr.slice(0, 8)}...`,
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
        </div>
      </ErrorBoundary>
    </div>
  )
}
