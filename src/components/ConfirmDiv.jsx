import { useDispatch, useSelector } from 'react-redux'
import { IoCloseOutline } from "react-icons/io5"
import { setConfirmPopup } from '../store/slices/CommonSlice'

const ConfirmDiv = ({ json }) => {

  const dispatch = useDispatch()
  const { ConfirmPopup } = useSelector(state => state.Common)

  const confirm = async () => {
    dispatch(setConfirmPopup({ ...ConfirmPopup, Result: true }))
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-5 backdrop-blur-sm`}>
      <div className="flex flex-row items-center justify-center">
        <button onClick={() => dispatch(setConfirmPopup(null))} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-green-300 hover:bg-gray-200 dark:hover:bg-gray-600">
          <IoCloseOutline /> close
        </button>
      </div>
      <div className="max-w-7xl overflow-x-auto overflow-y-auto whitespace-normal break-words p-2 rounded-xl shadow-2xl items-center">
        <button onClick={confirm} className="btn-primary btn-red" >
          Confirm
        </button>
      </div>
    </div>
  )
}

export default ConfirmDiv