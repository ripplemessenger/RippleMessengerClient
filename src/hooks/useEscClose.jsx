import { useEffect } from 'react'

/**
 * Call close callback when Escape key is pressed.
 * @param {boolean} isOpen - Whether the modal/dialog is currently open
 * @param {() => void} close - Function to call on Escape
 */
export default function useEscClose(isOpen, close) {
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, close])
}
