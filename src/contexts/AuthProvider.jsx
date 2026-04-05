import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import AuthContext from './AuthContext'
import { loginStart, logoutStart } from '../store/slices/UserSlice'

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const { IsAuth } = useSelector(state => state.User)

  useEffect(() => {
    const localSeed = localStorage.getItem("Seed")
    const localAddress = localStorage.getItem("Address")

    if (!IsAuth && localSeed) {
      dispatch(loginStart({ seed: localSeed, address: localAddress }))
    }
    setLoading(false)
  }, [dispatch, IsAuth])

  const logout = () => {
    dispatch(logoutStart())
    navigate('/')
  }

  return (
    <AuthContext.Provider value={{ IsAuth, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}