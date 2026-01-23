import { Link } from 'react-router-dom'

const InternalLink = ({ path, title, text_size }) => {
  return (
    <Link to={path} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex flex-col items-center justify-center">
      <span className={`${text_size} font-bold`}>
        {title}
      </span>
    </Link>
  )
}

export default InternalLink 