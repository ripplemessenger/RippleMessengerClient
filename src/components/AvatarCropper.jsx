import { useRef } from 'react'
import { useDispatch } from 'react-redux'
import { exists, readFile, writeFile, mkdir, BaseDirectory } from '@tauri-apps/plugin-fs'
import * as path from '@tauri-apps/api/path'
import { IoCopyOutline, IoCloseOutline } from "react-icons/io5"
import Cropper from "react-cropper"
import "cropperjs/dist/cropper.css"
import Logger from '../lib/Logger'
import { FileHash } from '../lib/MessengerUtil'
import { AvatarDir } from '../lib/AppConst'
import { useAppBaseDir } from '../hooks/useAppBaseDir'

const AvatarCropper = ({ address, imageSrc, onClose }) => {

  const AppBaseDir = useAppBaseDir()
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
          const fileName = `/${AvatarDir}/${address}.png`
          const savePath = await path.join(AppBaseDir, fileName)
          await writeFile(savePath, new Uint8Array(buffer))

          const filePath = await path.join(AppBaseDir, `/${AvatarDir}/${address}.png`)
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
        } catch (error) {
          Logger.error('avatar save', error)
        }
      }, 'image/png')
    }
  }

  return (
    <div className={`modal-overlay`} role="dialog" aria-modal="true">
      <div className="modal-action-row">
        <button onClick={() => saveAvatar()} className="modal-btn-yellow">
          <IoCopyOutline /> save
        </button>
        <button onClick={onClose} className="modal-btn-green">
          <IoCloseOutline /> cancel
        </button>
      </div>
      <div className="modal-content-wrapper">
        {
          imageSrc && (
            <div className="cropper-container">
              <Cropper
                src={imageSrc}
                aspectRatio={1}
                guides={true}
                viewMode={1}
                autoCropArea={0.8}
                minCropBoxWidth={96}
                minCropBoxHeight={96}
                ref={cropperRef}
              />
            </div>
          )}
      </div>
    </div>
  )
}

export default AvatarCropper
