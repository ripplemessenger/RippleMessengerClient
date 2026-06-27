import { Link } from 'react-router-dom'

const InternalLink = ({ path, title, text_size }) => {
  return (
    <Link to={path} className="p-2 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 flex flex-col items-center justify-center">
      <span className={`${text_size} font-bold text-text-primary dark:text-dark-text-primary`}>
        {title}
      </span>
    </Link>
  )
}

export default InternalLink 