import { useEffect } from 'react'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Trap keyboard focus within a dialog.
 *
 * On mount, moves focus to `initialFocusRef` (or the first focusable element
 * inside the container if not provided), and keeps Tab / Shift+Tab cycling
 * inside the dialog so focus never escapes to the background.
 *
 * @param {React.RefObject<HTMLElement>} containerRef - ref to the dialog root that wraps the focusable elements
 * @param {React.RefObject<HTMLElement>} [initialFocusRef] - element to focus first (defaults to first focusable)
 */
export function useFocusTrap(containerRef, initialFocusRef) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const target = initialFocusRef?.current || container.querySelector(FOCUSABLE)
    target?.focus()

    const onKey = (e) => {
      if (e.key !== 'Tab') return
      const nodes = Array.from(container.querySelectorAll(FOCUSABLE)).filter((el) => !el.disabled)
      if (nodes.length === 0) return
      const first = nodes[0]
      const last = nodes.at(-1)
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    container.addEventListener('keydown', onKey)
    return () => container.removeEventListener('keydown', onKey)
  }, [containerRef, initialFocusRef])
}
