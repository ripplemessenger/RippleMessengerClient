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
import { selectDisplayJson, selectFlashNotice } from '../selectors'

export default function MainLayout() {
  const ConfirmPopup = useConfirmPopup()
  const FlashNoticeData = useSelector(selectFlashNotice)
  const DisplayJsonData = useSelector(selectDisplayJson)
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col">
        {
          ConfirmPopup &&
          <ConfirmDiv />
        }
        {
          FlashNoticeData.message &&
          <FlashNotice message={FlashNoticeData.message} duration={FlashNoticeData.duration} />
        }
        {
          DisplayJsonData.json &&
          <JsonDiv json={DisplayJsonData.json} />
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