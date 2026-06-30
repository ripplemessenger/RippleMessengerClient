import { useEffect, useMemo, useRef } from 'react'
import { useDispatch } from 'react-redux'

const PageList = ({ current_page, total_page, dispatch_type, payload }) => {
  const dispatch = useDispatch()
  const bound = useRef(false)
  // Use ref for payload to avoid re-binding keyboard listener on every parent re-render
  // when payload is an inline object literal (new reference each render).
  const payloadRef = useRef(payload)
  payloadRef.current = payload

  // Keyboard navigation: left/right arrow keys
  useEffect(() => {
    if (bound.current) return
    bound.current = true
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft' && current_page > 1) {
        dispatch({ type: dispatch_type, payload: { ...payloadRef.current, page: current_page - 1 } })
      } else if (e.key === 'ArrowRight' && current_page < total_page) {
        dispatch({ type: dispatch_type, payload: { ...payloadRef.current, page: current_page + 1 } })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      bound.current = false
    }
  }, [current_page, total_page, dispatch_type, dispatch])

  const pages = useMemo(() => {
    if (total_page <= 1) return []

    // Build visible range: [current-2 .. current+2], clamped
    const half = 2
    let start = Math.max(1, current_page - half)
    let end = Math.min(total_page, current_page + half)

    // Always include first and last page; shrink range if too close to edge
    if (start === 1) end = Math.min(6, total_page)
    if (end === total_page) start = Math.max(1, total_page - 5)

    const result = []
    if (current_page > 1) {
      result.push({ type: 'prev' })
    }
    if (start > 1) {
      result.push({ type: 'page', num: 1 })
      if (start > 2) result.push({ type: 'ellipsis' })
    }
    for (let i = start; i <= end; i++) {
      result.push({ type: 'page', num: i })
    }
    if (end < total_page) {
      if (end < total_page - 1) result.push({ type: 'ellipsis' })
      result.push({ type: 'page', num: total_page })
    }
    if (current_page < total_page) {
      result.push({ type: 'next' })
    }
    return result
  }, [current_page, total_page])

  const goto = (p) => {
    dispatch({ type: dispatch_type, payload: { ...payload, page: p } })
  }

  return (
    <div className='flex flex-row items-center gap-1'>
      {pages.map((item, idx) => {
        if (item.type === 'prev') {
          return (
            <button key={`p-${idx}`} className="page cursor-pointer px-2" onClick={() => goto(current_page - 1)} aria-label="Previous page">
              ‹
            </button>
          )
        }
        if (item.type === 'next') {
          return (
            <button key={`n-${idx}`} className="page cursor-pointer px-2" onClick={() => goto(current_page + 1)} aria-label="Next page">
              ›
            </button>
          )
        }
        if (item.type === 'ellipsis') {
          return (
            <div key={`e-${idx}`} className="px-1 text-text-secondary/60 dark:text-dark-text-secondary/60 select-none">…</div>
          )
        }
        return (
          <button
            key={`page-${item.num}`}
            className={`${item.num === current_page ? 'current-page' : 'page'} cursor-pointer`}
            onClick={() => goto(item.num)}
          >
            {item.num}
          </button>
        )
      })}
    </div>
  )
}

export default PageList
