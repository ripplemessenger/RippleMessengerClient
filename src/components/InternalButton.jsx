const InternalButton = ({ title, onClick, text_size }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
    >
      <span className={`${text_size} font-bold text-blue-600 dark:text-blue-400`}>
        {title}
      </span>
    </button>
  )
}

export default InternalButton