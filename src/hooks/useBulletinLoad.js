import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

/**
 * Load a bulletin list on mount when authenticated and connected.
 *
 * @param {string} actionType - Redux action type string (e.g. 'LoadFollowBulletin')
 * @param {object} [payload] - Dispatch payload; defaults to { page: 1 }
 * @param {string|null} [guard=null] - Value that must be non-null before dispatch.
 *   Pass null to use User.Address (the common case). Pass a different value
 *   (e.g. BulletinAddress) for pages with their own guard condition.
 *   Pass undefined to skip the guard entirely.
 * @param {string[]} [extraDeps=[]] - Additional dependencies for the effect.
 */
export function useBulletinLoad(actionType, payload, guard, extraDeps = []) {
  const dispatch = useDispatch()
  const Address = useSelector(state => state.User.Address)
  const MessengerConnStatus = useSelector(state => state.Messenger.MessengerConnStatus)

  useEffect(() => {
    if (MessengerConnStatus && (guard === undefined || guard !== null)) {
      dispatch({ type: actionType, payload: payload ?? { page: 1 } })
    }
  }, [dispatch, MessengerConnStatus, guard ?? Address, actionType, ...extraDeps])
}
