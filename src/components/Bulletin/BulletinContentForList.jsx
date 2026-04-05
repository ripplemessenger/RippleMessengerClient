const BulletinContentForList = ({ content, onClick }) => {
  return (
    <div className={`mt-1 p-1 rounded-lg bg-neutral-200 dark:bg-neutral-700`} onClick={onClick}>
      <p className={`w-full break-all text-base text-slate-800 dark:text-slate-200`}>
        {content}
      </p>
    </div>
  )
}

export default BulletinContentForList