import { Navigate, Outlet } from 'react-router-dom'
import LoadingDiv from './LoadingDiv'
import useAuth from '../hooks/useAuth'

export default function ProtectedRoute() {
  const { IsAuth, loading } = useAuth()

  if (loading) {
    return <LoadingDiv isLoading={true} text="Loading..." />
  }

  return IsAuth ? <Outlet /> : <Navigate to="/" replace />
}