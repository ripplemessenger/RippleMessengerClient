import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { exists, readFile, BaseDirectory } from '@tauri-apps/plugin-fs'
import * as path from '@tauri-apps/api/path'
import { filesize_format } from '../../lib/AppUtil'
import { SaveBulletinFile } from '../../store/sagas/messenger.actions'
import { IoAttachSharp } from "react-icons/io5"
import { FileDir, FileImageExtRegex } from '../../lib/AppConst'
import { buildFileFullPath } from '../../lib/MessengerUtil'
import { useAppBaseDir } from '../../hooks/useAppBaseDir'

const BulletinFileViewer = ({ name, ext, size, hash }) => {

  const AppBaseDir = useAppBaseDir()
  const [fileImage, setFileImage] = useState(null)

  const dispatch = useDispatch()
  const FilePath = buildFileFullPath('', FileDir, hash).join('/')

  useEffect(() => {
    if (!FileImageExtRegex.test(ext)) return

    let objectUrl = null
    setImage().then(url => { objectUrl = url })

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [hash, ext])

  async function setImage() {
    const is_file_exist = await exists(FilePath, {
      baseDir: BaseDirectory.Resource,
    })
    if (is_file_exist) {
      const filePath = await path.join(AppBaseDir, FilePath)
      const bytes = await readFile(filePath)
      const blob = new Blob([new Uint8Array(bytes)])
      const url = URL.createObjectURL(blob)
      setFileImage(url)
      return url
    }
    return null
  }

  return (
    <div>
      <div className='flex flex-row justify-start'>
        <button className='flex flex-row justify-start file-link' title={filesize_format(size)} onClick={() => dispatch(SaveBulletinFile({ hash, size, name, ext }))} aria-label={`Download ${name}${ext}`}>
          <IoAttachSharp className="icon-sm" />
          ↓{name}{ext}
        </button>
      </div>
      {
        fileImage &&
        <img
          src={fileImage}
          alt={`${name}.${ext}`}
          className={`max-w-[600px] max-h-[600px] object-contain`}
        />
      }

    </div>
  )
}

export default BulletinFileViewer