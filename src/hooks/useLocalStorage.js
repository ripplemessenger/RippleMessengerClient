import { useState } from 'react'

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
      console.error('write LocalStorage :', error)
    }
  }

  return [storedValue, setValue]
}