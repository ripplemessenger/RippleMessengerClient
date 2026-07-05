import { useEffect, useRef } from 'react'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { IoCloseOutline } from 'react-icons/io5'

import TextInput from '../components/Form/TextInput'

/**
 * TempLoginModal - Temporary login via seed paste.
 * Props:
 *   displaySeed       - current seed text in the input
 *   tmpError          - error message string or null
 *   Seed              - Redux Seed (when non-null, input is hidden since login succeeded)
 *   onClose           - () => void
 *   onSeedUpdate      - (value: string) => void  called onChange
 */
export default function TempLoginModal({ displaySeed, tmpError, Seed, onClose, onSeedUpdate }) {
  const tmpSeedRef = useRef(null)

  useEscapeKey(onClose)

  useEffect(() => {
    tmpSeedRef.current?.focus()
  }, [])

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="max-w-md w-full mx-4 flex flex-col">
        <div className="modal-header-bar">
          <span className={`label text-base`}>Tmp Open</span>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors" aria-label="Close">
            <IoCloseOutline className="text-lg text-text-secondary dark:text-dark-text-secondary" />
          </button>
        </div>
        <div className="modal-content-area gap-3">
        {Seed === null && (
          <div className="form-card-container mb-6">
            <div className="space-y-4 flex flex-col justify-center">
              <div className="mt-1">
                <TextInput ref={tmpSeedRef} label={'Your Seed:'} type='password' value={displaySeed} autoComplete={"off"} placeholder={"s.................................."} onChange={(e) => onSeedUpdate(e.target.value)} />
              </div>
            </div>
          </div>
        )}
        {tmpError !== null && (
          <div className="p-3 rounded-xl border border-status-error/30 dark:border-status-error-dark/40 bg-status-error/5 dark:bg-status-error-dark/20 max-w-md mx-auto mb-4">
            <span className='text-sm font-medium block w-full break-words text-status-error dark:text-status-error-dark'>{tmpError}</span>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
