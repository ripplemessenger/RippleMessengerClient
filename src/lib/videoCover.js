import { readFile } from '@tauri-apps/plugin-fs'

/**
 * Capture a single frame from a local video file and return it as a JPEG Blob.
 *
 * Used to generate a cover thumbnail for video bulletins. Runs entirely in the
 * browser context (WebView2): reads the file via Tauri FS, plays it in an
 * offscreen <video>, seeks to a short offset, and draws the frame to a canvas.
 *
 * Fails soft: returns null on any error (unsupported codec, decode failure,
 * timeout) so callers can fall back to a placeholder without blocking.
 *
 * @param {string} filePath - Absolute path to the video file on disk
 * @param {object} [options]
 * @param {number} [options.maxWidth=640] - Maximum output width in CSS pixels
 * @param {number} [options.quality=0.8] - JPEG quality (0-1)
 * @param {number} [options.seekTime=0.1] - Seconds to seek to before capture
 * @param {number} [options.timeoutMs=8000] - Overall operation timeout
 * @returns {Promise<Blob|null>} A JPEG Blob, or null if capture failed
 */
export function generateVideoCoverBlob(
  filePath,
  { maxWidth = 640, quality = 0.8, seekTime = 0.1, timeoutMs = 8000 } = {}
) {
  return new Promise((resolve) => {
    let settled = false
    let video = null
    let objectUrl = null
    let timer = null

    const cleanup = () => {
      if (timer) clearTimeout(timer)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      if (video) {
        video.removeAttribute('src')
        video.load()
        if (video.parentNode) video.parentNode.removeChild(video)
      }
    }

    const fail = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve(null)
    }

    const succeed = (blob) => {
      if (settled) return
      settled = true
      cleanup()
      resolve(blob)
    }

    // Hard timeout so a stuck decode never hangs the caller
    timer = setTimeout(fail, timeoutMs)

    const loadFile = async () => {
      try {
        const bytes = await readFile(filePath)
        const blob = new Blob([new Uint8Array(bytes)])
        objectUrl = URL.createObjectURL(blob)

        video = document.createElement('video')
        video.muted = true
        video.playsInline = true
        video.preload = 'auto'
        // Keep it out of the visible layout but in the DOM so WebView2 decodes it
        video.style.cssText = 'position:fixed;left:-99999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none;'
        document.body.appendChild(video)
        video.src = objectUrl

        const onReady = () => {
          video.removeEventListener('loadeddata', onReady)
          // Seek to a short offset so we get a real frame (t=0 is often black)
          try {
            video.currentTime = seekTime
          } catch {
            // Some codecs reject seeks before metadata; fall through to capture at t=0
            capture()
            return
          }
          video.addEventListener('seeked', onSeeked, { once: true })
          // Safety: if seeked never fires, capture at current position
          setTimeout(
            () => {
              if (!settled) capture()
            },
            Math.min(3000, timeoutMs / 2)
          )
        }

        const onSeeked = () => capture()

        const capture = () => {
          if (settled) return
          const vw = video.videoWidth
          const vh = video.videoHeight
          if (!vw || !vh) {
            fail()
            return
          }
          // Scale down to maxWidth, preserve aspect ratio
          const scale = Math.min(1, maxWidth / vw)
          const w = Math.round(vw * scale)
          const h = Math.round(vh * scale)
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            fail()
            return
          }
          ctx.drawImage(video, 0, 0, w, h)
          canvas.toBlob(
            (out) => {
              if (out) succeed(out)
              else fail()
            },
            'image/jpeg',
            quality
          )
        }

        video.addEventListener('loadeddata', onReady, { once: true })
        video.addEventListener('error', fail, { once: true })
      } catch {
        fail()
      }
    }

    loadFile()
  })
}
