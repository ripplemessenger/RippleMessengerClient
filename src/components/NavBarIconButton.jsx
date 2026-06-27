const NavBarIconButton = ({ icon, label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="gap-1 flex flex-col items-center justify-center py-2 px-3 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 focus:outline-none"
    >
      {icon}
      <span className="text-base text-text-primary dark:text-dark-text-primary">
        {label}
      </span>
    </button>
  )
}

export default NavBarIconButton