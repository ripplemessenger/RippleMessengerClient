import { useState, useRef, useCallback, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { IoSettingsOutline, IoChevronDownOutline } from 'react-icons/io5'
import { MdStorage } from 'react-icons/md'

import LoadingDiv from '../components/LoadingDiv'

const TabGeneral = lazy(() => import('./setting/TabGeneral'))
const TabStorage = lazy(() => import('./setting/TabStorage'))

const VIEW_OPTIONS = [
  { value: 'general', key: 'setting.tab_general', icon: IoSettingsOutline },
  { value: 'storage', key: 'setting.tab_storage', icon: MdStorage }
]

export default function SettingPage() {
  const { t } = useTranslation()
  const [view, setView] = useState('general')
  const [showDropdown, setShowDropdown] = useState(false)
  const hideTimer = useRef(null)

  const handleDropdownEnter = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setShowDropdown(true)
  }, [])

  const handleDropdownLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => setShowDropdown(false), 200)
  }, [])

  const currentOption = VIEW_OPTIONS.find((o) => o.value === view) || VIEW_OPTIONS[0]

  return (
    <div className="page-wrapper">
      <div className="tab-page">
        <div className="page-inner w-auto items-center">
          {/* Title bar with hover dropdown switcher */}
          <div className="card-title flex flex-row items-center mb-1">
            <div className="relative" onMouseEnter={handleDropdownEnter} onMouseLeave={handleDropdownLeave}>
              <button
                className={`text-lg font-bold flex items-center gap-1 transition-colors ${showDropdown ? 'text-primary dark:text-dark-primary' : 'text-text-primary dark:text-dark-text-primary'}`}
                aria-label={t(currentOption.key)}
              >
                {t(currentOption.key)}
                <IoChevronDownOutline className="text-sm opacity-50" />
              </button>
              <div
                className={`absolute left-0 top-full pt-1 min-w-[140px] z-50 transition-opacity ${showDropdown ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
              >
                <div className="bg-surface dark:bg-dark-surface border border-primary/20 dark:border-primary/30 rounded-lg shadow-lg overflow-hidden">
                  {VIEW_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setView(opt.value)}
                      className={`flex items-center gap-2 px-3 py-2 text-sm w-full text-left transition-colors ${
                        view === opt.value
                          ? 'text-primary dark:text-dark-primary font-medium bg-primary/10 dark:bg-dark-primary/10'
                          : 'text-text-primary dark:text-dark-text-primary hover:bg-primary/10 dark:hover:bg-dark-primary/10'
                      }`}
                    >
                      <opt.icon className="w-4 h-4" />
                      {t(opt.key)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          {view === 'general' ? (
            <Suspense fallback={<LoadingDiv isLoading={true} />}>
              <TabGeneral />
            </Suspense>
          ) : (
            <Suspense fallback={<LoadingDiv isLoading={true} />}>
              <TabStorage />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  )
}
