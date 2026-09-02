import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { FiRefreshCw } from 'react-icons/fi'

import { selectMessengerConnStatus } from '../selectors'

/**
 * Banner showing WebSocket connection status.
 * Hidden when connected. Shows connecting indicator otherwise.
 */
export default function ConnectionStatusBanner() {
  const { t } = useTranslation()
  const MessengerConnStatus = useSelector(selectMessengerConnStatus)

  if (MessengerConnStatus) {
    return null
  }

  return (
    <div className="w-full flex items-center justify-center gap-2 py-1.5 px-4 text-sm font-medium bg-primary/5 dark:bg-dark-primary/5 border-b border-primary/10 dark:border-primary/20">
      <FiRefreshCw className="icon animate-spin text-primary dark:text-dark-primary" />
      <span className="text-text-secondary dark:text-dark-text-secondary">{t('common.connecting')}</span>
    </div>
  )
}
