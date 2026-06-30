import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { exists, readFile, BaseDirectory } from '@tauri-apps/plugin-fs'
import * as path from '@tauri-apps/api/path'
import { filesize_format } from '../../lib/AppUtil'
import { IoAttachSharp } from "react-icons/io5"
import { FileDir, FileImageExtRegex } from '../../lib/AppConst'
import { buildFileFullPath } from '../../lib/MessengerUtil'
import { useUserAddress } from '../../hooks/useUserSelectors'
import { useAppBaseDir } from '../../hooks/useAppBaseDir'

const ChatFileLink = ({ address, name, ext, size, hash }) => {

  const Address = useUserAddress()
  const AppBaseDir = useAppBaseDir()

  const [fileImage, setFileImage] = useState(null)
  const dispatch = useDispatch()

  useEffect(() => {
    if (!FileImageExtRegex.test(ext)) return

    let objectUrl = null
    setImage().then(url => { objectUrl = url })

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [hash, ext])

  async function setImage() {
    const fileRelPath = buildFileFullPath('', FileDir, hash).join('/')
    const is_file_exist = await exists(fileRelPath, {
      baseDir: BaseDirectory.Resource,
    })

    if (is_file_exist) {
      const filePath = await path.join(AppBaseDir, fileRelPath)
      const bytes = await readFile(filePath)
      const blob = new Blob([new Uint8Array(bytes)])
      const url = URL.createObjectURL(blob)
      setFileImage(url)
      return url
    }
    return null
  }

  const isSelf = address === Address

  return (
    <div title={filesize_format(size)} >
      {
        fileImage ?
          <div className={`flex flex-col gap-1 ${isSelf ? 'items-end' : 'items-start'}`}>
            <button className="file-link m-0" title={filesize_format(size)} onClick={() => dispatch({ type: 'SaveChatFile', payload: { hash: hash, size: size, name: name, ext: ext } })} aria-label={`Download ${name}${ext}`}>
              <IoAttachSharp className="icon-sm" />
              {name}{ext}
            </button>
            <img
              src={fileImage}
              alt={`${name}.${ext}`}
              className={`max-w-[600px] max-h-[600px] object-contain`}
            />
          </div>
          :
          <button className='flex flex-row justify-start file-link' title={filesize_format(size)} onClick={() => dispatch({ type: 'SaveChatFile', payload: { hash: hash, size: size, name: name, ext: ext } })} aria-label={`Download ${name}${ext}`}>
            <IoAttachSharp className="icon-sm" />
            {name}{ext}
          </button>
      }
    </div>
  )
}

export default ChatFileLink