const ToggleSwitch = ({ title, isChecked, onClick, ariaLabel }) => {
  return (
    <div className="max-w-md w-full rounded-2xl flex flex-col items-center">
      <div className="w-full max-w-sm">
        <button
          type="button"
          role="switch"
          aria-checked={isChecked}
          aria-label={ariaLabel || title}
          onClick={onClick}
          className={`relative inline-flex items-center
              w-14 h-8 rounded-full p-1 transition-all duration-300 ease-in-out
              cursor-pointer select-none border appearance-none outline-none
              ${isChecked
                ? 'bg-primary dark:bg-primary/80 border-primary-dark/30 shadow-gold'
                : 'bg-surface-alt dark:bg-dark-surface-alt border-primary/20 dark:border-primary/30'
              }
            `}
        >
          <div
            className={`rounded-full h-6 w-6 transform transition-transform duration-300 ease-in-out border-2
                ${isChecked
                  ? 'translate-x-6 bg-white dark:bg-dark-surface-card border-primary/40 shadow-gold'
                  : 'translate-x-0 bg-white dark:bg-dark-surface-card border-text-secondary/30 dark:border-dark-text-secondary/40 shadow-sm'
                }
              `}
          />
        </button>

        {
          title &&
          <div className="mt-1 flex items-center">
            <p className="text-text-primary dark:text-dark-text-primary font-medium text-sm">
              {title}
            </p>
          </div>
        }

      </div>
    </div>
  )
}

export default ToggleSwitch