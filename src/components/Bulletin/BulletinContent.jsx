
const BulletinContent = ({ content, onClick }) => {
  return (
    <div className={`mt-1 p-1 rounded-lg bg-neutral-200 dark:bg-neutral-700`} onClick={onClick}>
      <span className={`w-full text-base text-slate-800 dark:text-slate-200`}>
        {content}
      </span>
    </div>
  )
}

export default BulletinContent