const IconButton = ({ icon, onClick, className = 'nav-icon-btn', ariaLabel }) => {
  return (
    <button
      onClick={onClick}
      className={className}
      aria-label={ariaLabel}
    >
      {icon}
    </button>
  )
}

export default IconButton