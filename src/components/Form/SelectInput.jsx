import { IoChevronDownOutline } from "react-icons/io5"

const SelectInput = ({ label, options, selectedOption, onChange, disabled }) => {
  return (
    <div className="justify-center flex flex-col">
      <span className={`label`}>
        {label}
      </span>
      <div className="relative">
        <select
          id={label}
          name={label}
          className={`w-full px-3 py-2 pr-10 border rounded-lg shadow-sm appearance-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${disabled ? 'input-hover-disabled' : 'input-hover border-primary/30 dark:border-primary/40'} input-color`}
          value={selectedOption}
          onChange={onChange}
          disabled={disabled}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="font-mono">
              {option.label}
            </option>
          ))}
        </select>
        <IoChevronDownOutline className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-text-secondary dark:text-dark-text-secondary" />
      </div>
    </div>
  )
}

export default SelectInput
