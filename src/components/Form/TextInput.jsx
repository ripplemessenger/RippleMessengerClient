import { forwardRef, useState } from 'react'
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'

const TextInput = forwardRef(({ label, type = "text", placeholder, autoComplete = "on", value, onChange, onKeyDown, onBlur, disabled = false, error }, ref) => {
  const id = `input-${label.replace(/\s+/g, '-').toLowerCase()}`

  // Password visibility toggle — replaces browser's native eye icon for consistent behavior
  const [showPassword, setShowPassword] = useState(false)
  // CJK IME composition: browsers block IME on type="password".
  // Temporarily switch to "text" while composing so Chinese/Japanese/Korean input works.
  const [imeComposing, setImeComposing] = useState(false)

  const isPassword = type === 'password'
  const inputType = isPassword && (showPassword || imeComposing) ? 'text' : type

  return (
    <div className="justify-center flex flex-col">
      <label className={`label${error ? ' label-error' : ''}`} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input ref={ref} type={inputType}
          id={id}
          name={label}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          onCompositionStart={() => setImeComposing(true)}
          onCompositionEnd={() => setImeComposing(false)}
          aria-invalid={!!error}
          className={`w-full px-3 py-2 border rounded-lg shadow-sm appearance-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${isPassword ? 'pr-10' : ''} ${error ? 'border-status-error/60 dark:border-status-error-dark/60' : (disabled ? 'input-hover-disabled' : 'input-hover border-primary/30 dark:border-primary/40')} input-color`}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-text-secondary/60 dark:text-dark-text-secondary/60 hover:text-text-primary dark:hover:text-dark-text-primary transition-colors"
          >
            {showPassword ? <AiOutlineEyeInvisible className="text-base" /> : <AiOutlineEye className="text-base" />}
          </button>
        )}
      </div>
      {error && <span className="text-xs mt-1 text-status-error dark:text-status-error-dark">{error}</span>}
    </div>
  )
})

export default TextInput
