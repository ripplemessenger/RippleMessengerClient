import { useSelector } from 'react-redux'

export function useMessengerConnStatus() {
  return useSelector(state => state.Messenger.MessengerConnStatus)
}
