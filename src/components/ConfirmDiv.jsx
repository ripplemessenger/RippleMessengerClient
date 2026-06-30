import { useDispatch } from 'react-redux'
import { IoWarningOutline } from "react-icons/io5"
import { setConfirmPopup } from '../store/slices/CommonSlice'
import { useConfirmPopup } from '../hooks/useConfirmPopup'

const ConfirmDiv = ({ json }) => {

  const dispatch = useDispatch()
  const ConfirmPopup = useConfirmPopup()

  const confirm = async () => {
    dispatch(setConfirmPopup({ ...ConfirmPopup, Result: true }))
  }

  return (
    <div className={`modal-overlay`}>
      <div className="w-full max-w-md mx-auto">
        <div className="modal-content-wrapper">
          <div className="flex items-center gap-3 mb-4">
            <IoWarningOutline className="text-2xl text-status-warning dark:text-status-warning-dark" />
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">Confirm Action</h3>
          </div>
          {ConfirmPopup && (
            <p className="mb-6 text-text-secondary dark:text-dark-text-secondary">{ConfirmPopup.Content || 'Are you sure?'}</p>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={() => dispatch(setConfirmPopup(null))} className="btn-md bg-surface-alt/80 dark:bg-dark-surface-alt/80 text-text-secondary dark:text-dark-text-secondary border border-primary/20 dark:border-primary/30 hover:bg-primary/10 dark:hover:bg-primary/20">
              Cancel
            </button>
            <button onClick={confirm} className="btn-md btn-red">
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDiv
