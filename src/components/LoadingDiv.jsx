const LoadingDiv = ({ isLoading = false, text = 'Loading...' }) => {
  if (!isLoading) return null

  return (
    <div className="modal-overlay">
      <div className="p-10 rounded-2xl shadow-gold-lg flex flex-col items-center gap-6
        bg-gradient-card dark:bg-dark-gradient-card border border-primary/30 dark:border-primary/40">
        <div className="relative">
          <div className="w-16 h-16 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>

        <div className="text-xl font-semibold text-text-primary dark:text-dark-text-primary tracking-wide">
          {text}
        </div>
      </div>
    </div>
  )
}

export default LoadingDiv