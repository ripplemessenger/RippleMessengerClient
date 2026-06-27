const TextareaInput = ({ label, placeholder, value, onChange, disabled = false }) => {
  return (
    <div className="justify-center flex flex-col">
      <span className={`label`}>
        {label}
      </span>
      <textarea
        id={label}
        name={label}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={onChange}
        className={`w-full min-h-[100px] resize-y px-3 py-2 border rounded-lg shadow-sm appearance-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${disabled ? 'input-hover-disabled' : 'input-hover border-primary/30 dark:border-primary/40'} input-color`}
      />
    </div>
  )
}

export default TextareaInput