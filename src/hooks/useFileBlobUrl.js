import { useEffect, useRef, useState } from 'react'
import { readFile } from '@tauri-apps/plugin-fs'

/**
 * Custom hook to manage file-to-blob URL lifecycle with proper cleanup.
 * Reads a file via Tauri FS plugin, creates a Blob URL, and revokes on unmount/prop change.
 *
 * Fixes the closure-based cleanup bug where objectUrl was captured before
 * the async readFile resolved, causing Blob URLs to leak on rapid remount.
 *
 * @param {string|null} filePath - Absolute file path (null to skip)
 * @param {string|null} mimeType - MIME type for the Blob (e.g. 'image/png'), or null
 * @returns {string|null} The blob URL, or null if not ready / error
 */
export function useFileBlobUrl(filePath, mimeType = null) {
  const [blobUrl, setBlobUrl] = useState(null)
  const currentUrlRef = useRef(null)

  useEffect(() => {
    if (!filePath) {
      setBlobUrl(null)
      return
    }

    let mounted = true

    const loadFile = async () => {
      try {
        const bytes = await readFile(filePath)
        if (!mounted) return

        const options = mimeType ? { type: mimeType } : undefined
        const blob = new Blob([new Uint8Array(bytes)], options)
        const newUrl = URL.createObjectURL(blob)

        // Revoke previous URL before creating new one
        if (currentUrlRef.current) {
          URL.revokeObjectURL(currentUrlRef.current)
        }
        currentUrlRef.current = newUrl
        setBlobUrl(newUrl)
      } catch {
        setBlobUrl(null)
      }
    }

    loadFile()

    return () => {
      mounted = false
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current)
        currentUrlRef.current = null
      }
    }
  }, [filePath, mimeType])

  return blobUrl
}
