const LoadingDiv = ({ isLoading = false, text = 'loading...' }) => {
  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-5 backdrop-blur-sm">
      <div className="p-8 rounded-xl shadow-2xl flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div className="text-xl font-medium text-gray-700 dark:text-gray-200">
          {text}
        </div>
      </div>
    </div>
  )
}

export default LoadingDiv