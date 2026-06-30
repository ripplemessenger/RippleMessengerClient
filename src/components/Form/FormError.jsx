const FormError = ({ error }) => {
  return (
    <div className="justify-center items-center">
      {
        error !== null &&
        <div className="bg-gradient-card dark:bg-dark-gradient-card p-6 rounded-xl shadow-gold-lg w-96 border border-status-error/30 dark:border-status-error/40">
          <span className='label-error'>
            {error}
          </span>
        </div>
      }
    </div>
  )
}

export default FormError