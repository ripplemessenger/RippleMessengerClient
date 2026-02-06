import { useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { exists, readFile, writeFile, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs'
import * as path from '@tauri-apps/api/path'
import { IoCopyOutline, IoCloseOutline } from "react-icons/io5"
import Cropper from "react-cropper"
import "cropperjs/dist/cropper.css"
import { FileHash } from '../lib/MessengerUtil'

const AvatarCropper = ({ address, imageSrc, onClose }) => {

  const { AppBaseDir } = useSelector(state => state.Common)
  const dispatch = useDispatch()
  const cropperRef = useRef(null)

  const saveAvatar = async () => {
    const is_avater_dir_exist = await exists('avatar', {
      baseDir: BaseDirectory.Resource,
    })
    if (!is_avater_dir_exist) {
      await mkdir('avatar', {
        baseDir: BaseDirectory.Resource,
      })
    }
    if (cropperRef.current) {
      const cropper = cropperRef.current.cropper
      const canvas = cropper.getCroppedCanvas({
        width: 96,
        height: 96,
        imageSmoothingQuality: 'high'
      })

      canvas.toBlob(async (blob) => {
        try {
          const buffer = await blob.arrayBuffer()
          const fileName = `/avatar/${address}.png`
          const savePath = await path.join(AppBaseDir, fileName)
          await writeFile(savePath, new Uint8Array(buffer))

          const filePath = await path.join(AppBaseDir, `/avatar/${address}.png`)
          const content = await readFile(filePath)
          const size = content.length
          const hash = FileHash(content)
          dispatch({
            type: 'SaveSelfAvatar', payload: {
              hash: hash,
              size: size,
              timestamp: Date.now(),
            }
          })
          onClose()
          // alert(`save to: ${savePath}`)
        } catch (error) {
          console.error('save fail:', error)
          // alert('save fail')
        }
      }, 'image/png')
    }
  }

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-5 backdrop-blur-sm`}>
      <div className="flex flex-row items-center justify-center">
        <button onClick={() => saveAvatar()} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-yellow-300 hover:bg-gray-200 dark:hover:bg-gray-600">
          <IoCopyOutline /> save
        </button>
        <button onClick={onClose} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-green-300 hover:bg-gray-200 dark:hover:bg-gray-600">
          <IoCloseOutline /> cancel
        </button>
      </div>
      <div className="max-w-7xl overflow-x-auto overflow-y-auto whitespace-normal break-words p-2 rounded-xl shadow-2xl items-center">
        {
          imageSrc && (
            <Cropper
              src={imageSrc}
              aspectRatio={1}
              guides={true}
              viewMode={1}
              autoCropArea={0.8}
              minCropBoxWidth={96}
              minCropBoxHeight={96}
              ref={cropperRef}
              style={{ height: 800, width: '100%' }}
            />
          )}
      </div>
    </div>
  )
}

export default AvatarCropper