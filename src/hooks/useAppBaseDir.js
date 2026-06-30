import { useSelector } from 'react-redux'

export function useAppBaseDir() {
  return useSelector(state => state.Common.AppBaseDir)
}
