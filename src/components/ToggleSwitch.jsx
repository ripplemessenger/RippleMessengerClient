const ToggleSwitch = ({ title, isChecked, onClick }) => {
  return (
    <div className="max-w-md w-full rounded-2xl flex flex-col items-center">
      <div className="w-full max-w-sm">
        <div
          onClick={onClick}
          className={`relative inline-flex items-center 
              w-14 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out
              cursor-pointer select-none
              ${isChecked ? 'bg-green-500' : 'bg-gray-300'}
            `}
        >
          <div
            className={`bg-white shadow-md rounded-full h-6 w-6 transform transition-transform duration-300 ease-in-out
                ${isChecked ? 'translate-x-6' : 'translate-x-0'}
              `}
          />
        </div>

        {
          title &&
          <div className="mt-1 flex items-center">
            <p className="text-gray-700 font-medium">
              {title}
            </p>
          </div>
        }

      </div>
    </div>
  )
}

export default ToggleSwitch