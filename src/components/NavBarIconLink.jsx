import { Link } from 'react-router-dom'

const NavBarIconLink = ({ path, icon, label, count = 0, size = "w-12 h-12" }) => {
  const showBadge = count > 0
  const badgeText = count > 9999 ? "9999+" : String(count)

  const badgeWidthClass =
    badgeText.length === 1 ? "min-w-5" :
      badgeText.length === 2 ? "min-w-6" :
        badgeText.length === 3 ? "min-w-7" :
          "min-w-8"
  return (
    <Link
      to={path}
      className="p-2 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 flex flex-col items-center justify-center focus:outline-none overflow-visible"
    >
      <div className="relative inline-block">
        {icon}
        {showBadge && (
          <div
            className={`
            absolute -bottom-1 -right-1
            flex items-center justify-center
            bg-primary text-white text-xs font-bold
            rounded-full border-2 border-surface dark:border-dark-surface
            shadow-gold
            ${badgeWidthClass}
            h-5 px-1.5
            leading-none
          `}
          >
            {badgeText}
          </div>
        )}
      </div>
      <span className="text-sm text-text-primary dark:text-dark-text-primary">
        {label}
      </span>
    </Link>
  )
}

export default NavBarIconLink