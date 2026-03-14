import { Navigate, Outlet } from 'react-router-dom'
import useAuth from '../hooks.jsx/useAuth'

export default function PublicOnlyRoute() {
  const { IsAuth, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  return IsAuth ? <Navigate to="/" replace /> : <Outlet />
}