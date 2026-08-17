/**
 * Settings helpers — read localStorage settings with default fallbacks.
 * Centralized so all settings reads share the same null/empty handling.
 */

/** Read a boolean setting from localStorage with a default fallback */
export function getSettingBool(key, defaultValue) {
  const v = localStorage.getItem(key)
  if (v === null || v === undefined) return defaultValue
  return v === 'true'
}

/** Read a string setting from localStorage with a default fallback */
export function getSettingString(key, defaultValue) {
  const v = localStorage.getItem(key)
  if (v === null || v === undefined || v === '') return defaultValue
  return v
}
