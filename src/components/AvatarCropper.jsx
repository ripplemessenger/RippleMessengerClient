import { convertFileSrc } from '@tauri-apps/api/core'
import { useState, useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { exists, readFile, writeFile, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs'
import * as path from '@tauri-apps/api/path'
import { IoCopyOutline, IoCloseOutline } from "react-icons/io5"
import Cropper from "react-cropper"
import "cropperjs/dist/cropper.css"
import { FileHash } from '../lib/MessengerUtil'

const AvatarCropper = ({ address, imageSrc, onClose }) => {

  const dispatch = useDispatch()
  // const [croppedImage, setCroppedImage] = useState(null)
  const cropperRef = useRef(null)

  const saveAvatar = async () => {
    const is_avater_dir_exist = await exists('avatar', {
      baseDir: BaseDirectory.AppLocalData,
    })
    if (!is_avater_dir_exist) {
      await mkdir('Avatar', {
        baseDir: BaseDirectory.AppLocalData,
      })
    }
    // console.log(cropperRef.current)
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
          const fileName = `/Avatar/${address}.png`
          const savePath = await path.join(await path.appCacheDir(), fileName)
          // console.log(savePath)
          await writeFile(savePath, new Uint8Array(buffer))

          const filePath = await path.join(await path.appCacheDir(), `/Avatar/${address}.png`)
          const content = await readFile(filePath)
          // console.log(content)
          const size = content.length
          const hash = FileHash(content)
          // console.log(size)
          // console.log(hash)
          dispatch({
            type: 'SaveSelfAvatar', payload: {
              // address: address,
              hash: hash,
              size: size,
              timestamp: Date.now(),
              // is_saved: true
            }
          })
          // const webPath = convertFileSrc(savePath)
          // setCroppedImage(webPath)
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