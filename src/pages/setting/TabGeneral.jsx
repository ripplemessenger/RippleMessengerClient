import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { invoke } from '@tauri-apps/api/core'
import {
  IoColorPaletteOutline,
  IoCloseOutline,
  IoNotificationsOutline,
  IoNotificationsOffOutline,
  IoInformationCircleOutline
} from 'react-icons/io5'

import ToggleSwitch from '../../components/ToggleSwitch'

import { useTheme } from '../../components/ThemeProvider'
import { FLASH_DURATION_MS } from '../../lib/AppConst'
import { getSettingBool, getSettingString } from '../../lib/SettingsUtil'
import { playNotificationSound } from '../../lib/SoundUtil'
import { setFlashNoticeMessage } from '../../store/slices/CommonSlice'

const STORAGE_KEY_CLOSE_TO_TRAY = 'closeToTray'
const STORAGE_KEY_NOTIFICATIONS = 'enableNotifications'
const STORAGE_KEY_MESSAGE_SOUND = 'messageSound'
const STORAGE_KEY_START_MINIMIZED = 'startMinimized'

const THEME_OPTIONS = [
  { value: 'light', key: 'setting.light', icon: '☀️' },
  { value: 'dark', key: 'setting.dark', icon: '🌙' },
  { value: 'system', key: 'setting.system', icon: '💻' }
]

const SOUND_OPTIONS = [
  { value: 'chime', label: 'Chime', icon: '🔔' },
  { value: 'pop', label: 'Pop', icon: '🫧' },
  { value: 'ping', label: 'Ping', icon: '📞' },
  { value: 'bloop', label: 'Bloop', icon: '💬' },
  { value: 'ding', label: 'Ding', icon: '🔔' },
  { value: 'blip', label: 'Blip', icon: '👾' },
  { value: 'none', key: 'setting.none', icon: '🔇' }
]

export default function TabGeneral() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { theme, setTheme } = useTheme()

  // Close to tray — defaults to true (current behavior)
  const [closeToTray, setCloseToTray] = useState(() => getSettingBool(STORAGE_KEY_CLOSE_TO_TRAY, true))

  // Desktop notifications — defaults to true
  const [enableNotifications, setEnableNotifications] = useState(() => getSettingBool(STORAGE_KEY_NOTIFICATIONS, true))

  // Message sound — defaults to 'chime'
  const [messageSound, setMessageSound] = useState(() => getSettingString(STORAGE_KEY_MESSAGE_SOUND, 'chime'))

  // Start minimized — defaults to false
  const [startMinimized, setStartMinimized] = useState(() => getSettingBool(STORAGE_KEY_START_MINIMIZED, false))

  // Persist close-to-tray preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CLOSE_TO_TRAY, String(closeToTray))
  }, [closeToTray])

  // Persist notification preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, String(enableNotifications))
  }, [enableNotifications])

  // Persist message sound preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MESSAGE_SOUND, messageSound)
  }, [messageSound])

  // Persist start minimized preference
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_START_MINIMIZED, String(startMinimized))
  }, [startMinimized])

  const handleThemeChange = (value) => {
    setTheme(value)
    dispatch(setFlashNoticeMessage({ message: t('setting.theme_changed', { value }), duration: FLASH_DURATION_MS }))
  }

  const handleMessageSoundChange = (value) => {
    setMessageSound(value)
    playNotificationSound(value)
    dispatch(setFlashNoticeMessage({ message: t('setting.sound_changed', { value }), duration: FLASH_DURATION_MS }))
  }

  return (
    <div className="tab-page">
      <div className="mx-auto flex flex-col mt-4 w-full max-w-full min-w-0">
        <div className="card-title">{t('setting.tab_general')}</div>

        {/* Theme Section */}
        <div className="w-full max-w-full min-w-0 rounded-xl card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <IoColorPaletteOutline className="text-xl text-primary dark:text-dark-primary" />
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
              {t('setting.appearance')}
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            <span className="label">{t('setting.theme')}</span>
            <div className="flex gap-3 flex-wrap">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleThemeChange(opt.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    theme === opt.value
                      ? 'border-primary dark:border-dark-primary bg-primary/10 dark:bg-dark-primary/10 text-text-primary dark:text-dark-text-primary shadow-sm'
                      : 'border-primary/20 dark:border-primary/30 hover:border-primary/40 dark:hover:border-primary/50 text-text-secondary dark:text-dark-text-secondary'
                  }`}
                >
                  <span className="text-base">{opt.icon}</span>
                  <span className="text-sm font-medium">{t(opt.key)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Behavior Section */}
        <div className="w-full max-w-full min-w-0 rounded-xl card p-6 flex flex-col gap-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <IoCloseOutline className="text-xl text-primary dark:text-dark-primary" />
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
              {t('setting.behavior')}
            </h3>
          </div>

          {/* Close to Tray */}
          <div className="flex items-center justify-between gap-4 py-2 border-b border-primary/10 dark:border-primary/20 last:border-b-0">
            <div className="flex flex-col">
              <span className="text-text-primary dark:text-dark-text-primary font-medium">
                {t('setting.close_to_tray')}
              </span>
              <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                {t('setting.close_to_tray_desc')}
              </span>
            </div>
            <ToggleSwitch
              isChecked={closeToTray}
              onClick={async () => {
                const next = !closeToTray
                setCloseToTray(next)
                try {
                  await invoke('set_close_to_tray', { closeToTray: next })
                } catch (e) {
                  console.error('Failed to set close to tray:', e)
                }
              }}
              ariaLabel={t('setting.close_to_tray')}
            />
          </div>

          {/* Start Minimized */}
          <div className="flex items-center justify-between gap-4 py-2 border-b border-primary/10 dark:border-primary/20 last:border-b-0">
            <div className="flex flex-col">
              <span className="text-text-primary dark:text-dark-text-primary font-medium">
                {t('setting.start_minimized')}
              </span>
              <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                {t('setting.start_minimized_desc')}
              </span>
            </div>
            <ToggleSwitch
              isChecked={startMinimized}
              onClick={async () => {
                const next = !startMinimized
                setStartMinimized(next)
                try {
                  await invoke('set_start_minimized', { startMinimized: next })
                } catch (e) {
                  console.error('Failed to set start minimized:', e)
                }
              }}
              ariaLabel={t('setting.start_minimized')}
            />
          </div>

          {/* Desktop Notifications */}
          <div className="flex items-center justify-between gap-4 py-2 border-b border-primary/10 dark:border-primary/20 last:border-b-0">
            <div className="flex flex-col">
              <span className="text-text-primary dark:text-dark-text-primary font-medium">
                {t('setting.desktop_notifications')}
              </span>
              <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                {enableNotifications ? (
                  <>
                    <IoNotificationsOutline className="inline mr-1 text-status-success" />
                    {t('setting.notifications_enabled')}
                  </>
                ) : (
                  <>
                    <IoNotificationsOffOutline className="inline mr-1 text-text-secondary/60" />
                    {t('setting.notifications_disabled')}
                  </>
                )}
              </span>
            </div>
            <ToggleSwitch
              isChecked={enableNotifications}
              onClick={() => setEnableNotifications((v) => !v)}
              ariaLabel={t('setting.desktop_notifications')}
            />
          </div>

          {/* Message Sound */}
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex flex-col">
              <span className="text-text-primary dark:text-dark-text-primary font-medium">
                {t('setting.message_sound')}
              </span>
              <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                {t('setting.message_sound_desc')}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {SOUND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleMessageSoundChange(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                    messageSound === opt.value
                      ? 'border-primary dark:border-dark-primary bg-primary/10 dark:bg-dark-primary/10 text-text-primary dark:text-dark-text-primary shadow-sm'
                      : 'border-primary/20 dark:border-primary/30 hover:border-primary/40 dark:hover:border-primary/50 text-text-secondary dark:text-dark-text-secondary'
                  }`}
                >
                  <span className="text-sm">{opt.icon}</span>
                  <span className="text-xs font-medium">{opt.key ? t(opt.key) : opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="w-full max-w-full min-w-0 rounded-xl card p-4 flex flex-col gap-2 mt-4">
          <div className="flex items-center gap-2">
            <IoInformationCircleOutline className="text-base text-primary dark:text-dark-primary" />
            <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
              {t('setting.settings_saved')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
