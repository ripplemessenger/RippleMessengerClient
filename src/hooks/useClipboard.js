import { useCallback } from 'react'

/**
 * Hook to copy text to clipboard with a success callback.
 * @param {Function} onSuccess - Callback to call on successful copy
 * @returns {Function} Copy function that takes text
 */
export function useClipboard(onSuccess) {
  return useCallback(async (text, message = 'Copied!') => {
    try {
      await navigator.clipboard.writeText(text)
      if (onSuccess) onSuccess(message)
    } catch {
      // Copy failed silently
    }
  }, [onSuccess])
}
