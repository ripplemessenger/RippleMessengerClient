import { useEffect } from 'react'

/**
 * Hook to trigger a callback when Escape key is pressed.
 * @param {Function|null} onEscape - Callback to fire on Escape, or null to skip
 */
export function useEscapeKey(onEscape) {
  useEffect(() => {
    if (!onEscape) return
    const handler = (e) => {
      if (e.key === 'Escape') onEscape()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onEscape])
}
