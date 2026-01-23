const SelectInput = ({ label, options, selectdOption, onChange, disabled }) => {
  return (
    <div className="justify-center flex flex-col">
      <span className={`lable`}>
        {label}
      </span>
      <select
        id={label}
        name={label}
        className={`w-96 p-2 border rounded shadow-xl appearance-none block ${disabled ? 'input-hover-disabled' : 'input-hover border-green-500'} input-color`}
        value={selectdOption}
        onChange={onChange}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="font-mono">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default SelectInput