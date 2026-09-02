import React, { useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { filesize_format } from '../../lib/AppUtil'
import { SaveBulletinFile } from '../../store/sagas/messenger.actions'
import { IoAttachSharp } from 'react-icons/io5'
import { FileDir, FileImageExtRegex, RiskFileExts } from '../../lib/AppConst'
import { buildFileFullPath } from '../../lib/MessengerUtil'
import { useAppBaseDir } from '../../hooks/useAppBaseDir'
import { useFileBlobUrl } from '../../hooks/useFileBlobUrl'

const BulletinFileViewer = ({ name, ext, size, hash }) => {
  const { t } = useTranslation()
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

  return (
    <div>
      <div className="flex flex-row justify-start">
        <button
          className="flex flex-row justify-start file-link"
          title={filesize_format(size)}
          onClick={() => {
            if (clickTimerRef.current) {
              // Double-click: save + open (or reveal for risky files)
              clearTimeout(clickTimerRef.current)
              clickTimerRef.current = null
              dispatch(
                SaveBulletinFile({
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
                dispatch(SaveBulletinFile({ hash, size, name, ext }))
              }, 300)
            }
          }}
          aria-label={t('file.download', { name: `${name}${ext}` })}
        >
          <IoAttachSharp className="icon-sm" />↓{name}
          {ext}
        </button>
      </div>
      {fileImage && (
        <img src={fileImage} alt={`${name}.${ext}`} className={`max-w-[600px] max-h-[600px] object-contain`} />
      )}
    </div>
  )
}

export default React.memo(BulletinFileViewer)
