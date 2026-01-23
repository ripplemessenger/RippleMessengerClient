const FormError = ({ error }) => {
  return (
    <div className="justify-center items-center">
      {
        error !== null &&
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-96">
          <span className='text-3xl font-bold text-red-800 dark:text-red-200'>
            {error}
          </span>
        </div>
      }
    </div>
  )
}

export default FormError