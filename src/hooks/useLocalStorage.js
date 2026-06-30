import { useState } from 'react'
import Logger from '../lib/Logger'

export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? item : initialValue
    } catch (error) {
      return initialValue
    }
  })

  const setValue = (value) => {
    try {
      setStoredValue(value)
      localStorage.setItem(key, value)
    } catch (error) {
      Logger.error('write LocalStorage failed', error)
    }
  }

  return [storedValue, setValue]
}