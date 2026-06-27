const AssetSelect = ({ label, options, selectdOption, onChange, disabled }) => {
  return (
    <div className="flex flex-row items-center gap-2">
      <label className="label">{label}</label>
      <select
        id={label}
        name={label}
        className="w-96 px-3 py-2 border rounded-lg appearance-none block input-color input-hover focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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
  )
}

export default AssetSelect