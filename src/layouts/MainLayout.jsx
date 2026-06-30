import { useSelector } from 'react-redux'
import { Outlet } from 'react-router-dom'

import ConfirmDiv from '../components/ConfirmDiv'
import ConnectionStatusBanner from '../components/ConnectionStatusBanner'
import FlashNotice from '../components/FlashNotice'
import Footer from '../components/Footer'
import Header from '../components/Header'
import JsonDiv from '../components/JsonDiv'
import { ThemeProvider } from '../components/ThemeProvider'
import { useConfirmPopup } from '../hooks/useConfirmPopup'

export default function MainLayout() {
  const ConfirmPopup = useConfirmPopup()
  const { FlashNoticeMessage, DisplayJson, FlashNoticeDuration } = useSelector(state => state.Common)
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col">
        {
          ConfirmPopup &&
          <ConfirmDiv />
        }
        {
          FlashNoticeMessage &&
          <FlashNotice message={FlashNoticeMessage} duration={FlashNoticeDuration} />
        }
        {
          DisplayJson &&
          <JsonDiv json={DisplayJson} />
        }
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