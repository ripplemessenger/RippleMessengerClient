/**
 * Reusable empty-state display with icon, heading, and optional description.
 *
 * @param {object} props
 * @param {React.ReactNode|string} props.icon - Icon component (e.g. <FiMessageSquare />)
 * @param {string} props.title - Heading text
 * @param {string} [props.description] - Optional description paragraph
 * @param {string} [props.className] - Additional CSS classes for the wrapper box
 */
export default function EmptyState({ icon, title, description, className = '' }) {
  return (
    <div className={`empty-state-box mx-auto max-w-sm py-12 ${className}`}>
      {icon}
      <h3 className='text-lg font-medium text-text-secondary dark:text-dark-text-secondary'>{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary/60 dark:text-dark-text-secondary/60 mt-2">{description}</p>
      )}
    </div>
  )
}
