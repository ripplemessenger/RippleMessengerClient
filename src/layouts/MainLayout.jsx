import { Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import FlashNotice from '../components/FlashNotice.jsx'
import { ThemeProvider } from '../components/ThemeProvider.jsx'
import JsonDiv from '../components/JsonDiv.jsx'

export default function MainLayout() {
  const { DisplayJson, FlashNoticeMessage, FlashNoticeDuration } = useSelector(state => state.Common)
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col">
        {
          FlashNoticeMessage &&
          <FlashNotice message={FlashNoticeMessage} duration={FlashNoticeDuration} />
        }
        {
          DisplayJson &&
          <JsonDiv json={DisplayJson} />
        }
        <Header />

        <main className="main flex-grow">
          <div className="mx-auto mt-16 max-w-6xl h-full p-2 rounded-lg">
            <Outlet />
          </div>
        </main>

        <Footer />
      </div>
    </ThemeProvider>
  )
}