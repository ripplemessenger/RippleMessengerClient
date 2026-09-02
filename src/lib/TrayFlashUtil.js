import { readFile } from '@tauri-apps/plugin-fs'
import { AvatarDir } from './AppConst'

const ICON_SIZE = 32

/**
 * Read a contact's avatar PNG from disk and downscale it to a 32x32
 * cover-cropped PNG (for the tray flash icon).
 *
 * @param {string} address - XRPL address of the sender
 * @param {string} appBaseDir - App base directory (from state.Common.AppBaseDir)
 * @returns {Promise<Uint8Array|null>} PNG bytes, or null if no avatar file
 */
export async function getAvatarIconBytes(address, appBaseDir) {
  if (!address || !appBaseDir) return null

  let raw
  try {
    raw = await readFile(`${appBaseDir}/${AvatarDir}/${address}.png`)
  } catch {
    return null
  }

  try {
    const blob = new Blob([new Uint8Array(raw)], { type: 'image/png' })
    const url = URL.createObjectURL(blob)
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = () => reject(new Error('avatar decode failed'))
        i.src = url
      })
      const canvas = document.createElement('canvas')
      canvas.width = ICON_SIZE
      canvas.height = ICON_SIZE
      const ctx = canvas.getContext('2d')
      // cover crop
      const scale = Math.max(ICON_SIZE / img.width, ICON_SIZE / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (ICON_SIZE - w) / 2, (ICON_SIZE - h) / 2, w, h)
      const out = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!out) return null
      return new Uint8Array(await out.arrayBuffer())
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch {
    return null
  }
}
