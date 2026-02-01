import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { exists, readFile, BaseDirectory } from '@tauri-apps/plugin-fs'
import * as path from '@tauri-apps/api/path'
import { filesize_format } from '../../lib/AppUtil'
import { IoAttachSharp } from "react-icons/io5"
import { FileImageExtRegex } from '../../lib/AppConst'

const BulletinFileViewer = ({ name, ext, size, hash, timestamp = Date.now() }) => {

  const [fileImage, setFileImage] = useState(null)

  const navigate = useNavigate()
  const dispatch = useDispatch()

  useEffect(() => {
    if (FileImageExtRegex.test(ext)) {
      setImage()
    }
  }, [hash, timestamp])

  async function setImage() {
    const is_file_exist = await exists(`File/${hash.substring(0, 3)}/${hash.substring(3, 6)}/${hash}`, {
      baseDir: BaseDirectory.AppLocalData,
    })
    if (is_file_exist) {
      const fileName = `/File/${hash.substring(0, 3)}/${hash.substring(3, 6)}/${hash}`
      const filePath = await path.join(await path.appCacheDir() + fileName)
      const bytes = await readFile(filePath)
      const blob = new Blob([new Uint8Array(bytes)])
      const url = URL.createObjectURL(blob)
      setFileImage(url)
    }
  }

  return (
    <div>
      {
        fileImage ?
          <div onClick={() => dispatch({ type: 'SaveBulletinFile', payload: { hash: hash, size: size, name: name, ext: ext } })}>
            {name}{ext}
            <img
              src={fileImage}
              alt={`${name}.${ext}`}
              className={`max-w-[300px] max-h-[300px] object-contain`}
            />
          </div>
          :
          <div className='flex flex-row justify-start file-link' title={filesize_format(size)} onClick={() => dispatch({ type: 'SaveBulletinFile', payload: { hash: hash, size: size, name: name, ext: ext } })}>
            <IoAttachSharp className="icon-sm" />
            {name}{ext}
          </div>
      }
    </div>
  )
}

export default BulletinFileViewer