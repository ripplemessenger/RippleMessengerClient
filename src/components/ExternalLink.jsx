const ExternalLink = ({ href, title, text_size, children }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex flex-col items-center justify-center"
    >
      {children}
      <span className={`${text_size} font-bold`}>
        {title}
      </span>
    </a>
  )
}

export default ExternalLink 