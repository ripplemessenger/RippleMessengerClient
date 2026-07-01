import { Link } from 'react-router-dom'
import Badge from './Badge'

const NavBarIconLink = ({ path, icon, label, count = 0, size = "w-12 h-12" }) => {
  return (
    <Link
      to={path}
      className="p-2 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 flex flex-col items-center justify-center focus:outline-none overflow-visible"
    >
      <div className="relative inline-block">
        {icon}
        {count > 0 && <Badge count={count} />}
      </div>
      <span className="text-sm text-text-primary dark:text-dark-text-primary">
        {label}
      </span>
    </Link>
  )
}

export default NavBarIconLink