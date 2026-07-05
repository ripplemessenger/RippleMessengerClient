import React, { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { setFlashNoticeMessage } from '../store/slices/CommonSlice'
import { IoInformationCircleOutline } from "react-icons/io5"

const FlashNotice = ({ message, duration }) => {
  const [isFadingOut, setIsFadingOut] = useState(false)
  const dispatch = useDispatch()

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setIsFadingOut(true)
        const fadeOutTimer = setTimeout(() => {
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
      className={`fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2
        bg-surface dark:bg-dark-surface border border-primary/30 dark:border-primary/50
        text-text-primary dark:text-dark-text-primary
        px-6 py-4 rounded-xl shadow-gold z-90 flex items-center gap-3
        ${isFadingOut ? 'opacity-0 transition-opacity duration-500' : 'opacity-100 transition-opacity duration-500'
        }`}
      role="alert"
    >
      <IoInformationCircleOutline className="text-xl text-primary dark:text-dark-primary shrink-0" />
      <span className="font-medium">{message}</span>
    </div>
  )
}

export default React.memo(FlashNotice)
