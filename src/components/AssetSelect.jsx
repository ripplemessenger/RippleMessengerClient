const AssetSelect = ({ label, options, selectdOption, onChange, disabled }) => {
  return (
    <div className="flex flex-row items-center">
      <div className="items-center shadow-sm">
        <span className='text-xl text-gray-500 dark:text-gray-200 p-2'>
          {label}
        </span>
      </div>
      <div>
        <select
          id={label}
          name={label}
          className="w-96 p-2 border rounded shadow-xl appearance-none block dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:border-green-500 hover:bg-green-300 bg-gray-200"
          value={selectdOption}
          onChange={onChange}
          disabled={disabled}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default AssetSelect