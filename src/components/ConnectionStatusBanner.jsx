import { useSelector } from 'react-redux'
import { FiRefreshCw } from 'react-icons/fi'

/**
 * Banner showing WebSocket connection status.
 * Hidden when connected. Shows connecting indicator otherwise.
 */
export default function ConnectionStatusBanner() {
  const MessengerConnStatus = useSelector(state => state.Messenger.MessengerConnStatus)

  if (MessengerConnStatus) {
    return null
  }

  return (
    <div className="w-full flex items-center justify-center gap-2 py-1.5 px-4 text-sm font-medium bg-primary/5 dark:bg-dark-primary/5 border-b border-primary/10 dark:border-primary/20">
      <FiRefreshCw className="icon animate-spin text-primary dark:text-dark-primary" />
      <span className="text-text-secondary dark:text-dark-text-secondary">Connecting to server...</span>
    </div>
  )
}
