import { useSelector } from 'react-redux'

export function useUserAddress() {
  return useSelector(state => state.User.Address)
}

export function useIsAuth() {
  return useSelector(state => state.User.IsAuth)
}
