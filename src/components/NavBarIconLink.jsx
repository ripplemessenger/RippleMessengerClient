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
      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex flex-col items-center justify-center"
    >
      <div className="relative inline-block">
        {icon}
        {showBadge && (
          <div
            className={`
            absolute -bottom-1 -right-1 
            flex items-center justify-center
            bg-red-500 text-white text-xs font-bold
            rounded-full border border-white
            shadow-sm
            ${badgeWidthClass}
            h-5
            leading-none
          `}
          >
            {badgeText}
          </div>
        )}
      </div>
      <span className="text-base">
        {label}
      </span>
    </Link>
  )
}

export default NavBarIconLink