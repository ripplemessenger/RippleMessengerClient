import { Suspense, lazy, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'

import ConfirmDiv from '../components/ConfirmDiv'
import ConnectionStatusBanner from '../components/ConnectionStatusBanner'
import FlashNotice from '../components/FlashNotice'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { ThemeProvider } from '../components/ThemeProvider'
import { useConfirmPopup } from '../hooks/useConfirmPopup'
import { selectDisplayJson, selectFlashNotice } from '../selectors'
import { SessionType } from '../lib/AppConst'
import { getFlashingSessions } from '../lib/FlashSessionTracker'
import { LoadCurrentSession } from '../store/sagas/messenger.actions'
import { setWindowFocused, setCurrentRoute } from '../store/slices/CommonSlice'

const JsonDiv = lazy(() => import('../components/JsonDiv'))

export default function MainLayout() {
  const ConfirmPopup = useConfirmPopup()
  const FlashNoticeData = useSelector(selectFlashNotice)
  const DisplayJsonData = useSelector(selectDisplayJson)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const groupList = useSelector((state) => state.Messenger.GroupList)

  // Track the current route so the message handler knows if the user is on
  // the chat page (vs. bulletin / settings, where a new message should still
  // flash + badge even if that session was the last one opened).
  useEffect(() => {
    dispatch(setCurrentRoute(location.pathname))
  }, [location.pathname, dispatch])

  // Track window focus (minimize / restore / Alt+Tab) so an incoming message
  // is only treated as "actively viewed" while the window actually has focus.
  useEffect(() => {
    let unlisten = null
    getCurrentWindow()
      .isFocused()
      .then((focused) => dispatch(setWindowFocused(focused)))
      .catch(() => {})
    getCurrentWindow()
      .onFocusChanged(({ payload: focused }) => {
        dispatch(setWindowFocused(focused))
      })
      .then((fn) => {
        unlisten = fn
      })
      .catch(() => {})
    return () => {
      if (unlisten) unlisten()
    }
  }, [dispatch])

  // Keep a ref to the latest GroupList so the (once-registered) tray handler
  // never reads a stale closure.
  const groupListRef = useRef(groupList)
  groupListRef.current = groupList

  // When the user clicks the tray icon, Rust emits `tray-show-requested`.
  // Decide where to navigate based on how many sessions are flashing:
  //   - exactly 1 → open that session directly
  //   - multiple  → go to the chat page and let the user pick
  useEffect(() => {
    let unlisten = null
    listen('tray-show-requested', () => {
      const sessions = getFlashingSessions()
      if (sessions.length === 0) return

      if (sessions.length === 1) {
        const key = sessions[0]
        if (key.startsWith('private:')) {
          const address = key.slice('private:'.length)
          navigate('/chat')
          dispatch(LoadCurrentSession({ type: SessionType.Private, address }))
        } else if (key.startsWith('group:')) {
          const hash = key.slice('group:'.length)
          const group = (groupListRef.current || []).find((g) => g.hash === hash)
          if (group) {
            const member = [...new Set([...group.member, group.created_by])]
            navigate('/chat')
            dispatch(
              LoadCurrentSession({
                type: SessionType.Group,
                hash: group.hash,
                name: group.name,
                member
              })
            )
          } else {
            navigate('/chat')
          }
        } else {
          navigate('/chat')
        }
      } else {
        navigate('/chat')
      }
      // NOTE: We do NOT clear the flashing tracker here. The flash + badge
      // should only clear when the user actually opens a conversation (the
      // session-load path in messenger.private.js / messenger.group.js does
      // that). If we navigated to the chat list (multiple sessions), the
      // tracker stays so the flash keeps reminding the user.
    })
      .then((fn) => {
        unlisten = fn
      })
      .catch(() => {})
    return () => {
      if (unlisten) unlisten()
    }
  }, [navigate, dispatch])

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col">
        {ConfirmPopup && <ConfirmDiv />}
        {FlashNoticeData.message && (
          <FlashNotice message={FlashNoticeData.message} duration={FlashNoticeData.duration} />
        )}
        {DisplayJsonData.json && (
          <Suspense fallback={null}>
            <JsonDiv json={DisplayJsonData.json} />
          </Suspense>
        )}
        <Header />
        <ConnectionStatusBanner />

        <main className="main flex-grow">
          <div className="content-wrapper h-full animate-fadeIn">
            <Outlet />
          </div>
        </main>

        <Footer />
      </div>
    </ThemeProvider>
  )
}
