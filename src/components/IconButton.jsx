const IconButton = ({ icon, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-1 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-green-500"
    >
      {icon}
    </button>
  )
}

export default IconButton