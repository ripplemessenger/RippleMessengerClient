import { Link } from 'react-router-dom'

const NavBarIconLink = ({ path, icon, label }) => {
  return (
    <Link
      to={path}
      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex flex-col items-center justify-center"
    >
      {icon}
      <span className="text-base">
        {label}
      </span>
    </Link>
  )
}

export default NavBarIconLink