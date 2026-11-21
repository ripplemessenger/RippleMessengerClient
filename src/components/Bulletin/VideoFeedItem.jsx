import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { IoPlay, IoPause, IoHeart, IoChatbubble, IoShareSocial, IoCloudOffline } from 'react-icons/io5'

import BulletinAvatarLink from './BulletinAvatarLink'
import BulletinLink from './BulletinLink'
import AvatarName from '../AvatarName'
import TagLink from './TagLink'
import { useAppBaseDir } from '../../hooks/useAppBaseDir'
import { useFileBlobUrl } from '../../hooks/useFileBlobUrl'
import { BulletinMarkToggle, BulletinReply, ShowForwardBulletin } from '../../store/sagas/messenger.actions'
import { FileDir } from '../../lib/AppConst'
import { MessageObjectType } from '../../lib/MessengerConst'
import { buildFileFullPath } from '../../lib/MessengerUtil'
import Logger from '../../lib/Logger'

// MIME by extension — the blob URL must carry the right type, otherwise some
// WebView2 builds refuse to play webm/mov even though the bytes are fine.
const VIDEO_MIME = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v'
}

/**
 * Single video feed item.
 *
 * Non-active: cover jpg full-screen + bottom info bar (no <video> element)
 * Active + downloaded: <video> blob URL auto-play (muted, cover as poster)
 * Active + downloading: progress bar
 * Active + failed: error message + retry
 * Active + not started: download button
 */
const VideoFeedItem = ({ bulletin, videoHash, isActive, isMuted, onStartDownload, playbackMode, onVideoEnded }) => {
  const { t } = useTranslation()
  const AppBaseDir = useAppBaseDir()
  const dispatch = useDispatch()

  const fileStatus = useSelector((state) => state.Messenger.FileStatusMap[videoHash] || null)
  const fileSavedToken = useSelector((state) => state.Messenger.FileSavedMap[videoHash] ?? null)

  // Favorite state is local: BulletinMarkToggle only writes the DB, the
  // in-memory bulletin object is not refreshed, so we track the toggle here.
  const [marked, setMarked] = useState(Boolean(bulletin.is_marked))

  const [showInfo, setShowInfo] = useState(true)
  const videoRef = useRef(null)
  const tapTimerRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  // Video file entry (for size + name)
  const videoFile = (bulletin.file || []).find((f) => f.Hash === videoHash) || null
  const videoSize = videoFile ? videoFile.Size : 0

  // Cover path
  const coverPath = `${AppBaseDir}/cover/${videoHash}.jpg`
  const coverUrl = useFileBlobUrl(coverPath, 'image/jpeg', fileSavedToken)

  // Video blob URL (always try to load from disk when active — if the file
  // exists it plays, if not useFileBlobUrl returns null and we show download)
  const videoFilePath = isActive ? buildFileFullPath(AppBaseDir, FileDir, videoHash).join('/') : null
  const videoMime = VIDEO_MIME[String(videoFile?.Ext || '').toLowerCase()] || 'video/mp4'
  const videoUrl = useFileBlobUrl(videoFilePath, videoMime, fileSavedToken)

  // Auto-play when active and video is ready
  useEffect(() => {
    if (isActive && videoUrl && videoRef.current) {
      Logger.info('[🎬 VideoFeedItem] play: hash=' + videoHash + ' url=' + (videoUrl ? 'ok' : 'null'))
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => {
          Logger.warn('[🎬 VideoFeedItem] autoplay blocked: ' + e.message)
        })
    }
    if (!isActive && videoRef.current) {
      Logger.info('[🎬 VideoFeedItem] pause (inactive): hash=' + videoHash)
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }, [isActive, videoUrl])

  // Reset time when video changes
  useEffect(() => {
    setCurrentTime(0)
    setDuration(0)
  }, [videoUrl])

  // Mute sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])

  // Tap handling: single tap = play/pause, double tap = toggle info
  const handleTap = () => {
    if (tapTimerRef.current) {
      // Double tap
      clearTimeout(tapTimerRef.current)
      tapTimerRef.current = null
      setShowInfo(!showInfo)
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapTimerRef.current = null
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play()
            setIsPlaying(true)
          } else {
            videoRef.current.pause()
            setIsPlaying(false)
          }
        }
      }, 250)
    }
  }

  // Seek handler
  const handleSeek = (e) => {
    e.stopPropagation()
    const v = videoRef.current
    if (!v || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    v.currentTime = ratio * duration
    setCurrentTime(v.currentTime)
  }

  const fmt = (s) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${sec}s`
  }

  // Download progress
  const cursor = fileStatus ? fileStatus.cursor : 0
  const length = fileStatus ? fileStatus.length : 0
  const progress = length > 0 ? Math.round((cursor / length) * 100) : 0
  const isFailed = Boolean(fileStatus && fileStatus.failed)
  const isDownloading = length > 0 && cursor < length && !isFailed

  const startDownload = () => {
    Logger.info('[🎬 VideoFeedItem] startDownload: hash=' + videoHash + ' size=' + videoSize)
    onStartDownload(videoHash, videoSize)
  }

  const toggleMark = () => {
    setMarked(!marked)
    dispatch(BulletinMarkToggle({ hash: bulletin.hash }))
  }

  const openComment = () => {
    dispatch(BulletinReply({ Address: bulletin.address, Sequence: bulletin.sequence, Hash: bulletin.hash }))
  }

  const openForward = () => {
    dispatch(
      ShowForwardBulletin({
        ObjectType: MessageObjectType.Bulletin,
        Address: bulletin.address,
        Sequence: bulletin.sequence,
        Hash: bulletin.hash
      })
    )
  }

  // --- Non-active: cover only ---
  if (!isActive) {
    if (coverUrl) Logger.info('[🎬 VideoFeedItem] render cover: hash=' + videoHash)
    else Logger.info('[🎬 VideoFeedItem] render placeholder (no cover): hash=' + videoHash)
    return (
      <div className="h-full w-full relative bg-black">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <IoPlay className="text-6xl text-white/20" />
          </div>
        )}
        {/* Bottom info bar */}
        {showInfo && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-2">
              <BulletinAvatarLink address={bulletin.address} classNames="avatar-sm" />
              <AvatarName address={bulletin.address} short_flag={true} />
            </div>
            <p className="text-white/80 text-sm mt-2 line-clamp-2">{bulletin.content}</p>
          </div>
        )}
      </div>
    )
  }

  // --- Active: video player ---
  return (
    <div className="h-full w-full relative bg-black" onClick={handleTap}>
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={coverUrl || undefined}
          className="w-full h-full object-contain"
          loop={playbackMode === 'single'}
          playsInline
          muted={isMuted}
          onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.target.duration)}
          onEnded={() => {
            setIsPlaying(false)
            if (playbackMode === 'single') {
              // loop attribute handles this, but reset time for safety
              if (videoRef.current) {
                videoRef.current.currentTime = 0
                videoRef.current.play()
                setIsPlaying(true)
              }
            } else if (playbackMode === 'list') {
              onVideoEnded?.()
            }
            // 'manual': do nothing, video stays at end
          }}
        />
      ) : isFailed ? (
        <div className="h-full w-full flex flex-col items-center justify-center gap-4">
          <IoCloudOffline className="text-5xl text-white/30" />
          <span className="text-white/60 text-sm">{t('video.failed')}</span>
          <button
            className="px-4 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              startDownload()
            }}
          >
            {t('video.retry')}
          </button>
        </div>
      ) : isDownloading ? (
        <div className="h-full w-full flex flex-col items-center justify-center gap-4">
          <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-white/60 text-sm">{t('bulletin.video_downloading', { progress })}</span>
        </div>
      ) : (
        <div className="h-full w-full flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-2 border-white/30 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-white/50 text-sm">{t('video.waiting_download', 'Preparing…')}</span>
        </div>
      )}

      {/* Progress bar + play/pause */}
      {videoUrl && (
        <div
          className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <button
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0"
              onClick={() => {
                if (videoRef.current) {
                  if (videoRef.current.paused) {
                    videoRef.current.play()
                    setIsPlaying(true)
                  } else {
                    videoRef.current.pause()
                    setIsPlaying(false)
                  }
                }
              }}
            >
              {isPlaying ? <IoPause className="text-white" /> : <IoPlay className="text-white ml-0.5" />}
            </button>
            <span className="text-xs text-white/70 shrink-0">{fmt(currentTime)}</span>
            <div className="flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer relative" onClick={handleSeek}>
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
            </div>
            <span className="text-xs text-white/70 shrink-0">{fmt(duration)}</span>
          </div>
        </div>
      )}

      {/* Bottom info bar */}
      {showInfo && (
        <div
          className="absolute bottom-12 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <BulletinAvatarLink address={bulletin.address} classNames="avatar-sm" />
            <AvatarName address={bulletin.address} short_flag={true} />
            <BulletinLink address={bulletin.address} sequence={bulletin.sequence} hash={bulletin.hash} />
          </div>
          <p className="text-white/80 text-sm mt-2 line-clamp-2">{bulletin.content}</p>
          {bulletin.tag?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {bulletin.tag.slice(0, 3).map((tag) => (
                <TagLink key={tag} tag={tag} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Right action bar */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
        {/* Favorite */}
        <button className="flex flex-col items-center gap-1 text-white" onClick={toggleMark}>
          <IoHeart className={`text-2xl ${marked ? 'text-red-500' : ''}`} />
          <span className="text-xs">{marked ? t('bulletin.marked') : t('bulletin.mark')}</span>
        </button>
        {/* Comment — opens the publish modal with a quote (same as detail page) */}
        <button className="flex flex-col items-center gap-1 text-white" onClick={openComment}>
          <IoChatbubble className="text-2xl" />
          <span className="text-xs">{t('video.comment')}</span>
        </button>
        {/* Share — opens the forward modal (same as detail page) */}
        <button className="flex flex-col items-center gap-1 text-white" onClick={openForward}>
          <IoShareSocial className="text-2xl" />
          <span className="text-xs">{t('video.share')}</span>
        </button>
      </div>
    </div>
  )
}

export default React.memo(VideoFeedItem)
