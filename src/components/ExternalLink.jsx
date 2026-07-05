import React from 'react'

const ExternalLink = ({ href, title, text_size, children }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="p-2 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 flex flex-col items-center justify-center gap-1"
    >
      {children}
      <span className={`${text_size} font-bold text-text-primary dark:text-dark-text-primary`}>
        {title}
      </span>
    </a>
  )
}

export default React.memo(ExternalLink) 