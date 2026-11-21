import React, { useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { filesize_format } from '../../lib/AppUtil'
import { SaveBulletinFile } from '../../store/sagas/messenger.actions'
import { IoAttachSharp } from 'react-icons/io5'
import { FileDir, FileImageExtRegex, FileVideoExtRegex, FileAudioExtRegex, RiskFileExts } from '../../lib/AppConst'
import { buildFileFullPath } from '../../lib/MessengerUtil'
import { useAppBaseDir } from '../../hooks/useAppBaseDir'
import { useFileBlobUrl } from '../../hooks/useFileBlobUrl'
import { AudioPlayer, VideoPlayer } from './BulletinMedia'

const BulletinFileViewer = ({ name, ext, size, hash }) => {
  const { t } = useTranslation()
  const AppBaseDir = useAppBaseDir()
  const dispatch = useDispatch()
  const clickTimerRef = useRef(null)
  const isRiskExt = RiskFileExts.includes(ext.toLowerCase().replace('.', ''))

  const isImage = FileImageExtRegex.test(ext)
  const isVideo = FileVideoExtRegex.test(ext)
  const isAudio = FileAudioExtRegex.test(ext)
  const isMedia = isImage || isVideo || isAudio

  const fileRelativePath = buildFileFullPath('', FileDir, hash).join('/')
  const filePath = isMedia ? `${AppBaseDir}/${fileRelativePath}` : null
  const fileSavedToken = useSelector((state) => state.Messenger.FileSavedMap[hash] ?? null)
  const fileUrl = useFileBlobUrl(filePath, null, fileSavedToken)

  return (
    <div>
      <div className="flex flex-row justify-start">
        <button
          className="flex flex-row justify-start file-link"
          title={filesize_format(size)}
          onClick={() => {
            if (clickTimerRef.current) {
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
      {fileUrl &&
        (isImage ? (
          <img src={fileUrl} alt={`${name}.${ext}`} className="max-w-[600px] max-h-[600px] object-contain" />
        ) : isVideo ? (
          <VideoPlayer url={fileUrl} name={name} ext={ext} />
        ) : isAudio ? (
          <AudioPlayer url={fileUrl} name={name} ext={ext} />
        ) : null)}
    </div>
  )
}

export default React.memo(BulletinFileViewer)
