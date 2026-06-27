const FormButton = ({ title, disabled = false, className = '', onClick, variant = 'primary' }) => {
  const variants = {
    primary: 'bg-gradient-primary text-white hover:shadow-gold',
    secondary: 'bg-secondary/20 dark:bg-dark-secondary/30 text-text-primary dark:text-dark-text-primary border border-primary/30 dark:border-primary/40 hover:border-primary/60',
    danger: 'bg-status-error/20 dark:bg-status-error-dark/30 text-status-error dark:text-status-error-dark border border-status-error/30 dark:border-status-error-dark/40 hover:border-status-error/60',
  }
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      className={`w-full mt-4 py-2.5 text-base font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant] || variants.primary} ${className}`}
      disabled={disabled}
    >
      {title}
    </button>
  )
}

export default FormButton
