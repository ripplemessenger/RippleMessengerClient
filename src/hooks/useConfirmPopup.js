import { useSelector } from 'react-redux'

export function useConfirmPopup() {
  return useSelector(state => state.Common.ConfirmPopup)
}
