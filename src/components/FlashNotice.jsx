import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { setFlashNoticeMessage } from '../store/slices/UserSlice'

const FlashNotice = ({ message, duration }) => {
  const [isFadingOut, setIsFadingOut] = useState(false)
  const dispatch = useDispatch()

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setIsFadingOut(true)
        const fadeOutTimer = setTimeout(() => {
          // onClose()
          setIsFadingOut(false)
          dispatch(setFlashNoticeMessage({ message: null, duration: 0 }))
        }, 500)
        return () => clearTimeout(fadeOutTimer)
      }, duration)
      return () => clearTimeout(timer)
    } else {
      setIsFadingOut(false)
    }
  }, [message])

  return (
    <div
      className={`fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded z-90 ${isFadingOut ? 'opacity-0 transition-opacity duration-500' : 'opacity-100 transition-opacity duration-500'
        }`}
      role="alert"
    >
      <span className="block sm:inline">{message}</span>
    </div>
  )
}

export default FlashNotice 