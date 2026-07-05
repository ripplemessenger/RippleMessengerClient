import React from 'react'

const InternalButton = ({ title, onClick, text_size }) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg hover:bg-primary/10 dark:hover:bg-primary/20 flex flex-col items-center justify-center"
    >
      <span className={`${text_size} font-bold text-primary dark:text-dark-primary`}>
        {title}
      </span>
    </button>
  )
}

export default React.memo(InternalButton)