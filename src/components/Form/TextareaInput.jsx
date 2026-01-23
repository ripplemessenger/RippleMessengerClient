const TextareaInput = ({ label, placeholder, value, onChange, disabled = false }) => {
  return (
    <div className="justify-center flex flex-col">
      <span className={`lable`}>
        {label}
      </span>
      <textarea
        id={label}
        name={label}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={onChange}
        className={`w-96 min-h-[100px] resize-y p-2 border rounded shadow-xl appearance-none ${disabled ? 'input-hover-disabled' : 'input-hover border-green-500'} input-color`}
      />
    </div>
  )
}

export default TextareaInput