const IconButton = ({ icon, onClick, className = 'nav-icon-btn' }) => {
  return (
    <button
      onClick={onClick}
      className={className}
    >
      {icon}
    </button>
  )
}

export default IconButton