const NavBarIconButton = ({ icon, label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50"
    >
      {icon}
      <span className="text-base">
        {label}
      </span>
    </button>
  )
}

export default NavBarIconButton