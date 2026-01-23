const TextInput = ({ label, type = "text", placeholder, autoComplete = "on", value, onChange, onBlur, disabled = false }) => {
  const id = `${label + Math.random()}`
  // const id = `${label}`
  return (
    <div className="justify-center flex flex-col">
      <span className={`lable`} htmlFor={id}>
        {label}
      </span>
      <input type={type}
        id={id}
        name={label}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`w-96 p-2 border rounded shadow-xl appearance-none ${disabled ? 'input-hover-disabled' : 'input-hover border-green-500'} input-color`}
      />
    </div>
  )
}

export default TextInput