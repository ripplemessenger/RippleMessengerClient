import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import { selectMessengerConnStatus, selectUserAddress } from '../selectors'

/**
 * Load a bulletin list when authenticated and connected.
 *
 * Dispatches once on initial mount (when connected), and again whenever the
 * guard or connection status changes. The effect is intentionally designed to
 * re-fire only on meaningful state transitions, not every render.
 *
 * @param {string} actionType - Redux action type string (e.g. 'LoadFollowBulletin').
 *   Must be a module-level constant, not an inline literal, to avoid creating
 *   a new reference each render (strings are interned so this is fine).
 * @param {object} [payload] - Dispatch payload; defaults to { page: 1 }.
 *   Pass a stable reference or a module-level constant to avoid unnecessary
 *   re-dispatches. Inline objects like { page: 1 } are acceptable because
 *   the hook uses a ref internally to skip identical payloads.
 * @param {*} [guard] - Dispatch guard value.
 *   - <code>undefined</code> (default): no extra guard, fires whenever connected.
 *   - <code>null</code>: gates on User.Address being non-null.
 *   - Any other value: used as the dependency-tracked guard directly.
 * @param {string[]} [extraDeps=[]] - Additional stable dependencies for the effect.
 */
export function useBulletinLoad(actionType, payload, guard, extraDeps = []) {
  const dispatch = useDispatch()
  const Address = useSelector(selectUserAddress)
  const MessengerConnStatus = useSelector(selectMessengerConnStatus)

  // Stabilize payload reference so inline objects don't cause every-render re-dispatch.
  const payloadRef = useRef(payload ?? { page: 1 })
  if (payload !== payloadRef.current) {
    payloadRef.current = payload ?? { page: 1 }
  }

  useEffect(() => {
    if (MessengerConnStatus && (guard === undefined || guard !== null)) {
      dispatch({ type: actionType, payload: payloadRef.current })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- payload is stabilized via ref
  }, [dispatch, MessengerConnStatus, guard ?? Address, actionType, payloadRef, ...extraDeps])
}
