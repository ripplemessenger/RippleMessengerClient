import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { IoPlayCircle, IoImages, IoDownload, IoMusicalNotes, IoChevronBack, IoChevronForward } from 'react-icons/io5'
import { FileDir, FileImageExtRegex, FileVideoExtRegex, FileAudioExtRegex } from '../../lib/AppConst'
import { buildFileFullPath } from '../../lib/MessengerUtil'
import { useAppBaseDir } from '../../hooks/useAppBaseDir'
import { useFileBlobUrl } from '../../hooks/useFileBlobUrl'
import { useEffect, useRef, useState, useCallback } from 'react'
import { SaveBulletinFile, CheckFileStatus } from '../../store/sagas/messenger.actions'
import Logger from '../../lib/Logger'

/**
 * Main media block for a bulletin. Renders the primary visual (video cover or
 * image) above the text content. Priority: video > image.
 *
 * States:
 * - Video downloaded: cover thumbnail + play badge → click navigates to /video_feed
 * - Video downloading: progress bar (chunk_cursor / chunk_length)
 * - Video not started: download button
 * - Image (no video): inline image
 * - Multiple images: first image + "N images" badge
 * - Audio (no video/image): inline <audio> player (or download button)
 * - Only non-media files: renders nothing (BulletinFileViewer handles those)
 *
 * @param {{file: Array<{Name:string,Ext:string,Size:number,Hash:string}>, bulletinHash?: string}} props
 */
/**
 * Module-level singleton: only one media element plays at a time across all
 * BulletinMedia instances (prevents two cards playing simultaneously).
 */
let _activePlayer = null
const pauseOtherPlayers = (self) => {
  if (_activePlayer && _activePlayer !== self) {
    _activePlayer.pause()
  }
  _activePlayer = self
}

/**
 * Custom audio player with a working progress bar (native <audio controls>
 * doesn't render a seek bar in Tauri WebView).
 */
const AudioPlayer = ({ url, name, ext }) => {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const toggle = useCallback(() => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) {
      pauseOtherPlayers(a)
      a.play()
      setPlaying(true)
    } else {
      a.pause()
      if (_activePlayer === a) _activePlayer = null
      setPlaying(false)
    }
  }, [])

  const seek = useCallback(
    (e) => {
      const a = audioRef.current
      if (!a || !duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      a.currentTime = ratio * duration
      setCurrentTime(a.currentTime)
    },
    [duration]
  )

  if (!url) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const fmt = (s) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`
  }

  return (
    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="w-10 h-10 rounded-full bg-gray-600 hover:bg-gray-500 flex items-center justify-center shrink-0"
        >
          {playing ? (
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-600 dark:text-gray-300 truncate mb-1">
            {name}.{ext}
          </div>
          <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full cursor-pointer relative" onClick={seek}>
            <div className="h-full bg-blue-500 rounded-full transition-none" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
      </div>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => setPlaying(false)}
      />
    </div>
  )
}

/**
 * Inline video player with custom controls (works for audio-only mp4 too).
 */
const VideoPlayer = ({ url, name, ext }) => {
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const toggle = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      pauseOtherPlayers(v)
      v.play()
      setPlaying(true)
    } else {
      v.pause()
      if (_activePlayer === v) _activePlayer = null
      setPlaying(false)
    }
  }, [])

  const seek = useCallback(
    (e) => {
      const v = videoRef.current
      if (!v || !duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      v.currentTime = ratio * duration
      setCurrentTime(v.currentTime)
    },
    [duration]
  )

  if (!url) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const fmt = (s) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`
  }

  return (
    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="w-10 h-10 rounded-full bg-gray-600 hover:bg-gray-500 flex items-center justify-center shrink-0"
        >
          {playing ? (
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-600 dark:text-gray-300 truncate mb-1">
            {name}.{ext}
          </div>
          <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full cursor-pointer relative" onClick={seek}>
            <div className="h-full bg-blue-500 rounded-full transition-none" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
      </div>
      <video
        ref={videoRef}
        src={url}
        preload="metadata"
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => setPlaying(false)}
        className="w-full max-h-[480px] rounded-lg bg-black"
      />
    </div>
  )
}

const BulletinMedia = ({ file }) => {
  const { t } = useTranslation()
  const AppBaseDir = useAppBaseDir()
  const dispatch = useDispatch()
  const [imageIndex, setImageIndex] = useState(0)
  const [videoIndex, setVideoIndex] = useState(0)

  // Classify files (tolerate empty/undefined — hooks below must run unconditionally)
  const files = file || []
  const videos = files.filter((f) => FileVideoExtRegex.test(f.Ext))
  const images = files.filter((f) => FileImageExtRegex.test(f.Ext))
  const audios = files.filter((f) => FileAudioExtRegex.test(f.Ext))

  // Priority: video > image > audio
  const currentVideo = videos.length > 0 ? videos[Math.min(videoIndex, videos.length - 1)] : null
  const currentImage = images.length > 0 ? images[Math.min(imageIndex, images.length - 1)] : null
  const primaryAudio = audios[0] || null

  // Get download status for the primary media
  const primaryMedia = currentVideo || currentImage || primaryAudio
  const mediaHash = primaryMedia ? primaryMedia.Hash : null
  const fileStatus = useSelector((state) => (mediaHash ? state.Messenger.FileStatusMap[mediaHash] || null : null))
  const fileSavedToken = useSelector((state) => (mediaHash ? (state.Messenger.FileSavedMap[mediaHash] ?? null) : null))
  const isSaved = (fileStatus && fileStatus.is_saved) || fileSavedToken !== null

  // Hydrate file status from DB on mount (survives app restart)
  useEffect(() => {
    if (!isSaved && mediaHash) {
      dispatch(CheckFileStatus({ hash: mediaHash }))
    }
  }, [isSaved, mediaHash, dispatch])

  // Video file blob URL (for inline playback)
  const videoFilePath =
    currentVideo && isSaved ? `${AppBaseDir}/${buildFileFullPath('', FileDir, currentVideo.Hash).join('/')}` : null
  const videoUrl = useFileBlobUrl(videoFilePath, null, fileSavedToken)

  // Image blob URL (for the current image in the carousel)
  const imageFilePath =
    currentImage && isSaved ? `${AppBaseDir}/${buildFileFullPath('', FileDir, currentImage.Hash).join('/')}` : null
  const imageUrl = useFileBlobUrl(imageFilePath, null, fileSavedToken)

  // Audio blob URL (only for the primary audio, lazy) — must be called unconditionally (hooks rule)
  const audioFilePath =
    primaryAudio && isSaved ? `${AppBaseDir}/${buildFileFullPath('', FileDir, primaryAudio.Hash).join('/')}` : null
  const audioUrl = useFileBlobUrl(audioFilePath, null, fileSavedToken)

  // No media at all (or no video/image/audio) — don't render (other files handled by BulletinFileViewer)
  if (!primaryMedia) {
    if (files.length > 0)
      Logger.info('[📎 BulletinMedia] no video/image/audio, files=' + files.map((f) => f.Ext).join(','))
    return null
  }

  Logger.info(
    '[📎 BulletinMedia] primary=' +
      (currentVideo ? 'video' : currentImage ? 'image' : 'audio') +
      ' hash=' +
      mediaHash +
      ' saved=' +
      isSaved +
      ' status=' +
      JSON.stringify(fileStatus)
  )

  // --- Video rendering ---
  if (currentVideo) {
    const { Hash, Name, Ext, Size } = currentVideo
    const videoCount = videos.length

    if (!isSaved) {
      // Downloading or not started
      const cursor = fileStatus ? fileStatus.cursor : 0
      const length = fileStatus ? fileStatus.length : 0
      const progress = length > 0 ? Math.round((cursor / length) * 100) : 0
      const isDownloading = length > 0 && cursor > 0 && cursor < length

      return (
        <div
          className="relative w-full aspect-video bg-black/80 rounded-lg overflow-hidden flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {isDownloading ? (
            <div className="flex flex-col items-center gap-2">
              <IoPlayCircle className="text-4xl text-white/50" />
              <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-white/60">{t('bulletin.video_downloading', { progress })}</span>
            </div>
          ) : (
            <button
              className="flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors"
              onClick={() => dispatch(SaveBulletinFile({ hash: Hash, size: Size, name: Name, ext: Ext }))}
            >
              <IoDownload className="text-3xl" />
              <span className="text-sm">{t('bulletin.video_download')}</span>
            </button>
          )}
          {videoCount > 1 && (
            <>
              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setVideoIndex((i) => (i - 1 + videoCount) % videoCount)
                }}
                aria-label="Previous video"
              >
                <IoChevronBack className="text-lg" />
              </button>
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setVideoIndex((i) => (i + 1) % videoCount)
                }}
                aria-label="Next video"
              >
                <IoChevronForward className="text-lg" />
              </button>
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-white text-xs">
                {videoIndex + 1} / {videoCount}
              </div>
            </>
          )}
        </div>
      )
    }

    // Video saved: inline player with prev/next navigation
    return (
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <VideoPlayer url={videoUrl} name={Name} ext={Ext} />
        {videoCount > 1 && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation()
                setVideoIndex((i) => (i - 1 + videoCount) % videoCount)
              }}
              aria-label="Previous video"
            >
              <IoChevronBack className="text-lg" />
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors z-10"
              onClick={(e) => {
                e.stopPropagation()
                setVideoIndex((i) => (i + 1) % videoCount)
              }}
              aria-label="Next video"
            >
              <IoChevronForward className="text-lg" />
            </button>
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-white text-xs z-10">
              {videoIndex + 1} / {videoCount}
            </div>
          </>
        )}
      </div>
    )
  }

  // --- Image rendering (no video) ---
  if (currentImage) {
    const { Name, Ext, Size, Hash } = currentImage
    const imageCount = images.length

    if (!isSaved) {
      // Image not downloaded yet
      return (
        <div className="w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
          <button
            className="flex flex-col items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            onClick={() => dispatch(SaveBulletinFile({ hash: Hash, size: Size, name: Name, ext: Ext }))}
          >
            <IoImages className="text-3xl" />
            <span className="text-sm">{t('bulletin.image_download')}</span>
          </button>
        </div>
      )
    }

    // Image saved: show inline with prev/next navigation
    return (
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        {imageUrl && (
          <img src={imageUrl} alt={`${Name}.${Ext}`} className="w-full max-h-[480px] object-contain rounded-lg" />
        )}
        {imageCount > 1 && (
          <>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setImageIndex((i) => (i - 1 + imageCount) % imageCount)
              }}
              aria-label="Previous image"
            >
              <IoChevronBack className="text-lg" />
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setImageIndex((i) => (i + 1) % imageCount)
              }}
              aria-label="Next image"
            >
              <IoChevronForward className="text-lg" />
            </button>
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-white text-xs">
              {imageIndex + 1} / {imageCount}
            </div>
          </>
        )}
      </div>
    )
  }

  // --- Audio rendering (no video, no image) ---
  if (primaryAudio) {
    const { Hash, Name, Ext, Size } = primaryAudio

    if (!isSaved) {
      // Audio not downloaded yet
      return (
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center p-4">
          <button
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            onClick={() => dispatch(SaveBulletinFile({ hash: Hash, size: Size, name: Name, ext: Ext }))}
          >
            <IoMusicalNotes className="text-2xl" />
            <span className="text-sm">{t('bulletin.audio_download')}</span>
          </button>
        </div>
      )
    }

    // Audio saved: inline player with custom progress bar
    return <AudioPlayer url={audioUrl} name={Name} ext={Ext} />
  }

  return null
}

export default React.memo(BulletinMedia)
export { AudioPlayer, VideoPlayer }
