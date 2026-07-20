import { useMemo, useState } from 'react'
import { MdOutlineArticle, MdInsertDriveFile, MdAccountCircle, MdExpandMore } from 'react-icons/md'
import { FcDatabase } from 'react-icons/fc'

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

function DatabaseCard({ summary }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-lg border p-4 flex flex-col items-center gap-2 bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 cursor-pointer transition-all hover:shadow-md"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="text-2xl text-sky-500"><FcDatabase /></div>
      <span className="text-xs text-text-secondary dark:text-dark-text-secondary">Database</span>
      <span className="text-xl font-bold">{summary.totalDbRecords ?? 0}</span>
      <span className="text-xs text-text-secondary/70 dark:text-dark-text-secondary/70">
        {formatSize(summary.dbFileSize)}
      </span>
      <MdExpandMore className={`text-sky-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      {expanded && (
        <div className="w-full mt-1 pt-2 border-t border-sky-200/50 dark:border-sky-800/50 space-y-1 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary dark:text-dark-text-secondary flex items-center gap-1">
              <MdOutlineArticle /> Bulletins
            </span>
            <strong>{summary.bulletinCount ?? 0}</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary dark:text-dark-text-secondary flex items-center gap-1">
              <MdAccountCircle /> Private Msgs
            </span>
            <strong>{summary.privateMsgCount ?? 0}</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary dark:text-dark-text-secondary flex items-center gap-1">
              <MdInsertDriveFile /> Group Msgs
            </span>
            <strong>{summary.groupMsgCount ?? 0}</strong>
          </div>
        </div>
      )}
    </div>
  )
}

export default function StorageSummaryPanel({ summary }) {
  const sizeCards = useMemo(() => {
    if (!summary) return []
    return [
      {
        label: 'Files',
        count: summary.fileCount,
        size: summary.fileSizeSum,
        icon: <MdInsertDriveFile className="text-2xl text-emerald-500" />,
        colorClass: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
      },
      {
        label: 'Avatars',
        count: summary.avatarCount,
        size: summary.avatarSizeSum,
        icon: <MdAccountCircle className="text-2xl text-purple-500" />,
        colorClass: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
      },
    ]
  }, [summary])

  if (!summary) {
    return (
      <div className="rounded-xl card p-6 mt-4 border">
        <h3 className="text-base font-medium mb-3">Storage Summary</h3>
        <div className="flex items-center justify-center py-8 text-text-secondary/60 dark:text-dark-text-secondary/60 text-sm">
          Loading storage data...
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl card p-6 mt-4 border">
      <h3 className="text-base font-medium mb-4">Storage Summary</h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <DatabaseCard summary={summary} />
        {sizeCards.map((card) => (
          <div key={card.label} className={`rounded-lg border p-4 flex flex-col items-center gap-2 ${card.colorClass}`}>
            {card.icon}
            <span className="text-xs text-text-secondary dark:text-dark-text-secondary">{card.label}</span>
            <span className="text-xl font-bold">{card.count ?? 0}</span>
            <span className="text-xs text-text-secondary/70 dark:text-dark-text-secondary/70">
              {formatSize(card.size)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
