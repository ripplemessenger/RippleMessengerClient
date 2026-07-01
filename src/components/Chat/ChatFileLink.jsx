import { useDispatch } from 'react-redux'
import { filesize_format } from '../../lib/AppUtil'
import { SaveChatFile } from '../../store/sagas/messenger.actions'
import { IoAttachSharp } from 'react-icons/io5'
import { FileDir, FileImageExtRegex } from '../../lib/AppConst'
import { buildFileFullPath } from '../../lib/MessengerUtil'
import { useUserAddress } from '../../hooks/useUserSelectors'
import { useAppBaseDir } from '../../hooks/useAppBaseDir'
import { useFileBlobUrl } from '../../hooks/useFileBlobUrl'

const ChatFileLink = ({ address, name, ext, size, hash }) => {
  const Address = useUserAddress()
  const AppBaseDir = useAppBaseDir()
  const dispatch = useDispatch()

  const fileRelativePath = buildFileFullPath('', FileDir, hash).join('/')
  const filePath = FileImageExtRegex.test(ext) ? `${AppBaseDir}/${fileRelativePath}` : null
  const fileImage = useFileBlobUrl(filePath, null)

  const isSelf = address === Address

  return (
    <div title={filesize_format(size)}>
      {fileImage ? (
        <div className={`flex flex-col gap-1 ${isSelf ? 'items-end' : 'items-start'}`}>
          <button className="file-link m-0" title={filesize_format(size)} onClick={() => dispatch(SaveChatFile({ hash, size, name, ext }))} aria-label={`Download ${name}${ext}`}>
            <IoAttachSharp className="icon-sm" />
            {name}{ext}
          </button>
          <img
            src={fileImage}
            alt={`${name}.${ext}`}
            className={`max-w-[600px] max-h-[600px] object-contain`}
          />
        </div>
      ) : (
        <button className='flex flex-row justify-start file-link' title={filesize_format(size)} onClick={() => dispatch(SaveChatFile({ hash, size, name, ext }))} aria-label={`Download ${name}${ext}`}>
          <IoAttachSharp className="icon-sm" />
          {name}{ext}
        </button>
      )}
    </div>
  )
}

export default ChatFileLink
