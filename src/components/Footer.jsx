import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { IoArrowBackSharp, IoArrowForwardSharp, IoReloadSharp, IoCheckmark } from 'react-icons/io5'
import { CN, GB, FR, RU, JP, KR, ES, PT, DE } from 'country-flag-icons/react/3x2'

import ExternalLink from './ExternalLink'
import InternalLink from './InternalLink'
import packageJson from '../../package.json'

const LANGUAGES = [
  { code: 'en', label: 'English', Flag: GB },
  { code: 'zh', label: '中文', Flag: CN },
  { code: 'ja', label: '日本語', Flag: JP },
  { code: 'de', label: 'Deutsch', Flag: DE },
  { code: 'fr', label: 'Français', Flag: FR },
  { code: 'ko', label: '한국어', Flag: KR },
  { code: 'ru', label: 'Русский', Flag: RU },
  { code: 'es', label: 'Español', Flag: ES },
  { code: 'pt', label: 'Português', Flag: PT }
]

export default function Footer() {
  const { t, i18n: currentI18n } = useTranslation()
  const [showLangMenu, setShowLangMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!showLangMenu) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowLangMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showLangMenu])

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
    setShowLangMenu(false)
  }

  const currentLang = LANGUAGES.find((l) => l.code === currentI18n.language) || LANGUAGES[0]
  const CurrentFlag = currentLang.Flag

  return (
    <footer className="footer bar">
      <div className="mx-auto max-w-7xl flex justify-between items-center px-8">
        <div className="flex items-center gap-2">
          <ExternalLink
            href={'https://github.com/RippleMessenger/RippleMessengerClient'}
            title={'RippleMessenger'}
            text_size={'text-base'}
          />
          <span className="text-xs text-muted">v{packageJson.version}</span>
        </div>
        <div className="flex items-center gap-1 bg-surface/20 dark:bg-dark-surface/20 rounded-lg p-1 backdrop-blur-sm">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            title={t('common.back')}
            aria-label={t('common.back')}
          >
            <IoArrowBackSharp className="icon" />
          </button>
          <button
            onClick={() => window.location.reload()}
            className="p-2 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            title={t('common.reload')}
            aria-label={t('common.reload')}
          >
            <IoReloadSharp className="icon" />
          </button>
          <button
            onClick={() => window.history.forward()}
            className="p-2 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            title={t('common.forward')}
            aria-label={t('common.forward')}
          >
            <IoArrowForwardSharp className="icon" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors cursor-pointer"
              title={t('common.language')}
              aria-label={t('common.language')}
            >
              <CurrentFlag className="w-6 h-auto" />
            </button>
            {showLangMenu && (
              <div className="absolute right-0 bottom-full mb-1 min-w-[140px] bg-surface dark:bg-dark-surface border border-primary/20 dark:border-primary/30 rounded-lg shadow-lg overflow-hidden z-50">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors ${
                      currentI18n.language === lang.code ? 'text-primary dark:text-dark-primary font-medium' : ''
                    }`}
                  >
                    <lang.Flag className="w-5 h-auto flex-shrink-0" />
                    <span>{lang.label}</span>
                    {currentI18n.language === lang.code && <IoCheckmark className="ml-auto text-sm" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <InternalLink path={'/about'} title={t('common.about')} text_size={'text-base'} />
        </div>
      </div>
    </footer>
  )
}
