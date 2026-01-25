import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { exists, readFile, writeFile, mkdir, BaseDirectory, stat } from '@tauri-apps/plugin-fs'
import * as path from '@tauri-apps/api/path'
import { filesize_format } from '../../lib/AppUtil'
import { setFlashNoticeMessage } from '../../store/slices/UserSlice'
import { IoAttachSharp } from "react-icons/io5"

const BulletinFileLink = ({ name, ext, size, hash }) => {

  const navigate = useNavigate()
  const dispatch = useDispatch()

  const download = async () => {
    const sour_dir = await path.appLocalDataDir()
    const sour_file_path = await path.join(sour_dir, `File`, hash.substring(0, 3), hash.substring(3, 6), hash)
    let isExist = await exists(sour_file_path)
    if (isExist) {
      const content = await readFile(sour_file_path)

      const dest_dir = await path.join(await path.downloadDir(), `RippleMessenger`)
      await mkdir(dest_dir, { recursive: true })
      const dest_file_path = await path.join(dest_dir, `${name}.${ext}`)
      await writeFile(dest_file_path, content)
      dispatch(setFlashNoticeMessage({ message: 'file saved to download directory', duration: 2000 }))
    } else {
      dispatch(setFlashNoticeMessage({ message: 'file not exist, fetching from server...', duration: 2000 }))
      dispatch({ type: 'FetchFile', payload: { hash: hash } })
    }
  }

  return (
    <div className='flex flex-row justify-start file-link' title={filesize_format(size)} onClick={() => download()}>
      <IoAttachSharp className="icon-sm" />
      {name}{ext}
    </div>
  )
}

export default BulletinFileLink