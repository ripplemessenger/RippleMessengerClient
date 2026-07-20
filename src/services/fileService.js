import * as path from '@tauri-apps/api/path'
import { remove, stat } from '@tauri-apps/plugin-fs'

import { FileDir } from '../lib/AppConst'
import { buildFileSubPath } from '../lib/MessengerUtil'

/**
 * Build the full filesystem path for a cached file given its hash.
 * Structure: baseDir / FileDir / hash[0:3] / hash[3:6] / hash
 * Returns a Promise<string> — Tauri path.join is async.
 */
export async function getFileFullPath(baseDir, hash) {
  const subPath = buildFileSubPath(hash)
  return path.join(baseDir, FileDir, ...subPath, hash)
}

/**
 * Delete a file from the local filesystem.
 * Returns true if the file was removed, false otherwise.
 */
export async function deleteFile(filePath) {
  try {
    await remove(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Check whether a file exists on disk and return its size.
 * Returns null if the file does not exist.
 */
export async function statFile(filePath) {
  try {
    const info = await stat(filePath)
    return { exists: true, size: info.size }
  } catch {
    return null
  }
}
