import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
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
import { FLASH_DURATION_MS, SettingPageTab } from '../../lib/AppConst'
import { playNotificationSound } from '../../lib/SoundUtil'
import { setFlashNoticeMessage } from '../../store/slices/CommonSlice'

const STORAGE_KEY_THEME = 'theme'
const STORAGE_KEY_CLOSE_TO_TRAY = 'closeToTray'
const STORAGE_KEY_NOTIFICATIONS = 'enableNotifications'
const STORAGE_KEY_MESSAGE_SOUND = 'messageSound'
const STORAGE_KEY_START_MINIMIZED = 'startMinimized'

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' }
]

const SOUND_OPTIONS = [
  { value: 'chime', label: 'Chime', icon: '🔔' },
  { value: 'pop', label: 'Pop', icon: '🫧' },
  { value: 'ping', label: 'Ping', icon: '📞' },
  { value: 'bloop', label: 'Bloop', icon: '💬' },
  { value: 'ding', label: 'Ding', icon: '🔔' },
  { value: 'blip', label: 'Blip', icon: '👾' },
  { value: 'none', label: 'None', icon: '🔇' }
]

export default function TabGeneral() {
  const dispatch = useDispatch()
  const { theme, setTheme } = useTheme()

  // Close to tray — defaults to true (current behavior)
  const [closeToTray, setCloseToTray] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CLOSE_TO_TRAY)
    return saved === null ? true : saved === 'true'
  })

  // Desktop notifications — defaults to true
  const [enableNotifications, setEnableNotifications] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS)
    return saved === null ? true : saved === 'true'
  })

  // Message sound — defaults to 'chime'
  const [messageSound, setMessageSound] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MESSAGE_SOUND)
    return saved || 'chime'
  })

  // Start minimized — defaults to false
  const [startMinimized, setStartMinimized] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_START_MINIMIZED)
    return saved === null ? false : saved === 'true'
  })

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
    dispatch(setFlashNoticeMessage({ message: `Theme changed to ${value}`, duration: FLASH_DURATION_MS }))
  }

  const handleMessageSoundChange = (value) => {
    setMessageSound(value)
    playNotificationSound(value)
    dispatch(setFlashNoticeMessage({ message: `Message sound: ${value}`, duration: FLASH_DURATION_MS }))
  }

  return (
    <div className="tab-page">
      <div className="mx-auto flex flex-col mt-4 w-full max-w-full min-w-0">
        <div className="card-title">{SettingPageTab.General}</div>

        {/* Theme Section */}
        <div className="w-full max-w-full min-w-0 rounded-xl card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <IoColorPaletteOutline className="text-xl text-primary dark:text-dark-primary" />
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">Appearance</h3>
          </div>

          <div className="flex flex-col gap-3">
            <span className="label">Theme</span>
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
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Behavior Section */}
        <div className="w-full max-w-full min-w-0 rounded-xl card p-6 flex flex-col gap-4 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <IoCloseOutline className="text-xl text-primary dark:text-dark-primary" />
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">Behavior</h3>
          </div>

          {/* Close to Tray */}
          <div className="flex items-center justify-between gap-4 py-2 border-b border-primary/10 dark:border-primary/20 last:border-b-0">
            <div className="flex flex-col">
              <span className="text-text-primary dark:text-dark-text-primary font-medium">Close to Tray</span>
              <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                Minimize to system tray instead of quitting when closing the window
              </span>
            </div>
            <ToggleSwitch
              isChecked={closeToTray}
              onClick={async () => {
                const next = !closeToTray
                setCloseToTray(next)
                await invoke('set_close_to_tray', { closeToTray: next })
              }}
              ariaLabel="Close to Tray"
            />
          </div>

          {/* Start Minimized */}
          <div className="flex items-center justify-between gap-4 py-2 border-b border-primary/10 dark:border-primary/20 last:border-b-0">
            <div className="flex flex-col">
              <span className="text-text-primary dark:text-dark-text-primary font-medium">Start Minimized</span>
              <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                Launch app hidden in system tray instead of showing the window
              </span>
            </div>
            <ToggleSwitch
              isChecked={startMinimized}
              onClick={async () => {
                const next = !startMinimized
                setStartMinimized(next)
                await invoke('set_start_minimized', { startMinimized: next })
              }}
              ariaLabel="Start Minimized"
            />
          </div>

          {/* Desktop Notifications */}
          <div className="flex items-center justify-between gap-4 py-2 border-b border-primary/10 dark:border-primary/20 last:border-b-0">
            <div className="flex flex-col">
              <span className="text-text-primary dark:text-dark-text-primary font-medium">Desktop Notifications</span>
              <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                {enableNotifications ? (
                  <>
                    <IoNotificationsOutline className="inline mr-1 text-status-success" />
                    Enabled — show tray icon flash on new messages
                  </>
                ) : (
                  <>
                    <IoNotificationsOffOutline className="inline mr-1 text-text-secondary/60" />
                    Disabled — no notification flashes
                  </>
                )}
              </span>
            </div>
            <ToggleSwitch
              isChecked={enableNotifications}
              onClick={() => setEnableNotifications((v) => !v)}
              ariaLabel="Desktop Notifications"
            />
          </div>

          {/* Message Sound */}
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="flex flex-col">
              <span className="text-text-primary dark:text-dark-text-primary font-medium">Message Sound</span>
              <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                Play a sound when receiving new messages
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
                  <span className="text-xs font-medium">{opt.label}</span>
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
              Settings are saved locally and persist across sessions.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
