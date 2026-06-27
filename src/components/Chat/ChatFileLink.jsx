import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { exists, readFile, BaseDirectory } from '@tauri-apps/plugin-fs'
import * as path from '@tauri-apps/api/path'
import { filesize_format } from '../../lib/AppUtil'
import { IoAttachSharp } from "react-icons/io5"
import { FileDir, FileImageExtRegex } from '../../lib/AppConst'

const ChatFileLink = ({ address, name, ext, size, hash }) => {

  const { Address } = useSelector(state => state.User)
  const { AppBaseDir } = useSelector(state => state.Common)

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
    const is_file_exist = await exists(`${FileDir}/${hash.substring(0, 3)}/${hash.substring(3, 6)}/${hash}`, {
      baseDir: BaseDirectory.Resource,
    })

    if (is_file_exist) {
      const fileName = `/${FileDir}/${hash.substring(0, 3)}/${hash.substring(3, 6)}/${hash}`
      const filePath = await path.join(AppBaseDir, fileName)
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
            <div className="file-link" style={{ margin: 0 }} title={filesize_format(size)} onClick={() => dispatch({ type: 'SaveChatFile', payload: { hash: hash, size: size, name: name, ext: ext } })}>
              <IoAttachSharp className="icon-sm" />
              {name}{ext}
            </div>
            <img
              src={fileImage}
              alt={`${name}.${ext}`}
              className={`max-w-[600px] max-h-[600px] object-contain`}
            />
          </div>
          :
          <div className='flex flex-row justify-start file-link' title={filesize_format(size)} onClick={() => dispatch({ type: 'SaveChatFile', payload: { hash: hash, size: size, name: name, ext: ext } })}>
            <IoAttachSharp className="icon-sm" />
            {name}{ext}
          </div>
      }
    </div>
  )
}

export default ChatFileLink