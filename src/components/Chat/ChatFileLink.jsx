import React, { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { filesize_format } from '../../lib/AppUtil'
import { SaveChatFile, CheckFileStatus } from '../../store/sagas/messenger.actions'
import { IoAttachSharp, IoSyncOutline, IoCloudDownloadOutline, IoAlertCircleOutline } from 'react-icons/io5'
import { FileDir, FileImageExtRegex, RiskFileExts } from '../../lib/AppConst'
import { buildFileFullPath } from '../../lib/MessengerUtil'
import { selectUserAddress } from '../../selectors'
import { useAppBaseDir } from '../../hooks/useAppBaseDir'
import { useFileBlobUrl } from '../../hooks/useFileBlobUrl'

const ChatFileLink = ({ address, name, ext, size, hash }) => {
  const { t } = useTranslation()
  const Address = useSelector(selectUserAddress)
  const AppBaseDir = useAppBaseDir()
  const dispatch = useDispatch()
  // Distinguish single-click (save only) vs double-click (save + open)
  const clickTimerRef = useRef(null)
  // Check if this file type is risky to auto-open
  const isRiskExt = RiskFileExts.includes(ext.toLowerCase().replace('.', ''))

  const fileRelativePath = buildFileFullPath('', FileDir, hash).join('/')
  const filePath = FileImageExtRegex.test(ext) ? `${AppBaseDir}/${fileRelativePath}` : null
  // Re-render trigger: set when this file finishes downloading (null until then)
  const fileSavedToken = useSelector((state) => state.Messenger.FileSavedMap[hash] ?? null)
  const fileImage = useFileBlobUrl(filePath, null, fileSavedToken)

  // Download status marker: saved / in-progress (N/M) / not-downloaded / failed
  const fileStatus = useSelector((state) => state.Messenger.FileStatusMap[hash] ?? null)
  useEffect(() => {
    dispatch(CheckFileStatus({ hash }))
  }, [hash, dispatch])

  const isSelf = address === Address
  const inProgress = !!(fileStatus && !fileStatus.is_saved && fileStatus.cursor > 0)
  const failed = !!(fileStatus && !fileStatus.is_saved && fileStatus.failed)
  const saved = !!(fileStatus && fileStatus.is_saved)

  return (
    <div title={filesize_format(size)}>
      {fileImage ? (
        <div className={`flex flex-col gap-1 ${isSelf ? 'items-end' : 'items-start'}`}>
          <button
            className="file-link m-0"
            title={filesize_format(size)}
            onClick={() => {
              if (clickTimerRef.current) {
                // Double-click: save + open (or reveal for risky files)
                clearTimeout(clickTimerRef.current)
                clickTimerRef.current = null
                dispatch(
                  SaveChatFile({
                    hash,
                    size,
                    name,
                    ext,
                    autoOpen: !isRiskExt,
                    revealOnly: isRiskExt
                  })
                )
              } else {
                // First click: wait 300ms to see if second click comes
                clickTimerRef.current = setTimeout(() => {
                  clickTimerRef.current = null
                  dispatch(SaveChatFile({ hash, size, name, ext }))
                }, 300)
              }
            }}
            aria-label={t('file.download', { name: `${name}${ext}` })}
          >
            <IoAttachSharp className="icon-sm" />
            {name}
            {ext}
          </button>
          <img src={fileImage} alt={`${name}.${ext}`} className={`max-w-[600px] max-h-[600px] object-contain`} />
        </div>
      ) : inProgress ? (
        <div
          className={`flex flex-row items-center gap-1 ${isSelf ? 'justify-end' : 'justify-start'}`}
          title={t('file.downloading', { size: filesize_format(size) })}
        >
          <IoSyncOutline className="icon-sm animate-spin" />
          <span className="opacity-70">
            {name}
            {ext} ({fileStatus.cursor}/{fileStatus.length})
          </span>
        </div>
      ) : saved ? (
        <button
          className="flex flex-row justify-start file-link"
          title={`${t('file.downloaded', { size: filesize_format(size) })} · ${t('file.hint_open')}`}
          onClick={() => {
            if (clickTimerRef.current) {
              // Double-click: save + open (or reveal for risky files)
              clearTimeout(clickTimerRef.current)
              clickTimerRef.current = null
              dispatch(
                SaveChatFile({
                  hash,
                  size,
                  name,
                  ext,
                  autoOpen: !isRiskExt,
                  revealOnly: isRiskExt
                })
              )
            } else {
              // First click: wait 300ms to see if second click comes
              clickTimerRef.current = setTimeout(() => {
                clickTimerRef.current = null
                dispatch(SaveChatFile({ hash, size, name, ext }))
              }, 300)
            }
          }}
          aria-label={t('file.download', { name: `${name}${ext}` })}
        >
          <IoAttachSharp className="icon-sm" />
          {name}
          {ext}
        </button>
      ) : (
        <button
          className="flex flex-row justify-start file-link"
          title={
            failed
              ? t('file.download_failed', { size: filesize_format(size) })
              : `${filesize_format(size)} · ${t('file.hint_save_open')}`
          }
          onClick={() => dispatch(SaveChatFile({ hash, size, name, ext }))}
          aria-label={t('file.download', { name: `${name}${ext}` })}
        >
          {failed ? <IoAlertCircleOutline className="icon-sm" /> : <IoCloudDownloadOutline className="icon-sm" />}
          {name}
          {ext}
        </button>
      )}
    </div>
  )
}

export default React.memo(ChatFileLink)
