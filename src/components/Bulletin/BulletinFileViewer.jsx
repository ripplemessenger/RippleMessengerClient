import { useDispatch } from 'react-redux'
import { filesize_format } from '../../lib/AppUtil'
import { SaveBulletinFile } from '../../store/sagas/messenger.actions'
import { IoAttachSharp } from 'react-icons/io5'
import { FileDir, FileImageExtRegex } from '../../lib/AppConst'
import { buildFileFullPath } from '../../lib/MessengerUtil'
import { useAppBaseDir } from '../../hooks/useAppBaseDir'
import { useFileBlobUrl } from '../../hooks/useFileBlobUrl'

const BulletinFileViewer = ({ name, ext, size, hash }) => {
  const AppBaseDir = useAppBaseDir()
  const dispatch = useDispatch()

  const fileRelativePath = buildFileFullPath('', FileDir, hash).join('/')
  const filePath = FileImageExtRegex.test(ext) ? `${AppBaseDir}/${fileRelativePath}` : null
  const fileImage = useFileBlobUrl(filePath, null)

  return (
    <div>
      <div className='flex flex-row justify-start'>
        <button className='flex flex-row justify-start file-link' title={filesize_format(size)} onClick={() => dispatch(SaveBulletinFile({ hash, size, name, ext }))} aria-label={`Download ${name}${ext}`}>
          <IoAttachSharp className="icon-sm" />
          ↓{name}{ext}
        </button>
      </div>
      {fileImage && (
        <img
          src={fileImage}
          alt={`${name}.${ext}`}
          className={`max-w-[600px] max-h-[600px] object-contain`}
        />
      )}
    </div>
  )
}

export default BulletinFileViewer
