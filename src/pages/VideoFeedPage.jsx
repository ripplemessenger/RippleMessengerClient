import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import {
  IoArrowBack,
  IoVolumeHigh,
  IoVolumeMute,
  IoGlobe,
  IoServer,
  IoRepeat,
  IoInfinite,
  IoHandLeft
} from 'react-icons/io5'

import VideoFeedItem from '../components/Bulletin/VideoFeedItem'
import BulletinPublish from '../components/Bulletin/BulletinPublish'
import BulletinForward from '../components/Bulletin/BulletinForward'
import { RequestRandomBulletin, VideoFeedPreload, FetchBulletinFile } from '../store/sagas/messenger.actions'
import { setFileStatus } from '../store/slices/MessengerSlice'
import { selectPublishFlags } from '../selectors'
import { dbAPI } from '../db'
import { FileVideoExtRegex } from '../lib/AppConst'
import Logger from '../lib/Logger'

const TARGET = 5 // initial batch size
const MAX_EMPTY_BATCHES = 5 // stop after N consecutive batches with no video
const WATCHDOG_MS = 15000 // no chunk progress for this long → re-request

/**
 * Full-screen vertical video feed (Douyin/TikTok style).
 * Entry: click a video cover in BulletinMedia → /video_feed?start={hash}
 *
 * - CSS snap-y snap-mandatory for full-page vertical scroll
 * - IntersectionObserver (0.6) detects the active item
 * - Feed data: start param → online random (402) → client filter → local fallback
 * - Preload: active+1/+2 download in background (VideoFeedPreload saga)
 * - Back: top-left button or Esc key
 */
const VideoFeedPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const startHash = searchParams.get('start') || null

  const { MessengerConnStatus, RandomBulletinList, RandomBulletinLoading, FileStatusMap, FileSavedMap } = useSelector(
    (state) => state.Messenger
  )
  const { showPublish, showForward } = useSelector(selectPublishFlags)

  // Feed items: array of { bulletin, videoHash }
  const [feedItems, setFeedItems] = useState([]) // internet feed (master)
  const [localFeedItems, setLocalFeedItems] = useState([]) // local-only feed
  const [activeIndex, setActiveIndex] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [sourceMode, setSourceMode] = useState('local') // 'internet' | 'local'
  const [playbackMode, setPlaybackMode] = useState('single') // 'single' | 'list' | 'manual'
  const [noMore, setNoMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [localTried, setLocalTried] = useState(false)
  const [localLoaded, setLocalLoaded] = useState(false) // local feed loaded once

  // The rendered feed depends on the current mode
  const displayItems = sourceMode === 'local' ? localFeedItems : feedItems

  const containerRef = useRef(null)
  const itemRefs = useRef([])
  const seenHashesRef = useRef(new Set())
  const pendingRef = useRef(false)
  const lenBeforeRef = useRef(0)
  const emptyBatchesRef = useRef(0)
  const watchdogRef = useRef({}) // hash -> { cursor, time }
  const requestedAtRef = useRef({}) // hash -> timestamp of the last download request
  const fileStatusRef = useRef({}) // mirror of FileStatusMap for the interval watchdog

  useEffect(() => {
    fileStatusRef.current = FileStatusMap
  }, [FileStatusMap])

  // Start (or restart) a download for one hash, recording the request time
  // so the watchdog can mark it failed when the node never responds.
  const startDownloadFor = useCallback(
    (hash, size) => {
      requestedAtRef.current[hash] = Date.now()
      dispatch(setFileStatus({ hash, is_saved: false, cursor: 0, length: 0, failed: false }))
      dispatch(FetchBulletinFile({ hash, size: size || 0 }))
    },
    [dispatch]
  )

  // --- Back navigation ---
  const goBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') goBack()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goBack])

  // --- Feed data loading ---
  const filterVideoBulletins = useCallback((bulletins) => {
    const result = []
    for (const b of bulletins) {
      if (seenHashesRef.current.has(b.hash)) continue
      const video = (b.file || []).find((f) => FileVideoExtRegex.test(f.Ext))
      if (video) {
        seenHashesRef.current.add(b.hash)
        result.push({ bulletin: b, videoHash: video.Hash })
      }
    }
    return result
  }, [])

  // 1. Mount: resolve the start item from local DB
  useEffect(() => {
    let cancelled = false
    Logger.info('[🎬 VideoFeedPage] mount, startHash=' + startHash + ', connStatus=' + MessengerConnStatus)
    ;(async () => {
      if (startHash) {
        try {
          const bulletin = await dbAPI.getBulletinByHash(startHash)
          if (bulletin) {
            const video = (bulletin.file || []).find((f) => FileVideoExtRegex.test(f.Ext))
            if (video) {
              setFeedItems([{ bulletin, videoHash: video.Hash }])
              seenHashesRef.current.add(bulletin.hash)
            }
          }
        } catch {
          // start bulletin not found locally — skip
        }
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [startHash])

  // 2. Response handling (declared BEFORE the request effect so the
  //    noMore/append decision lands before the next batch is dispatched).
  //    filterVideoBulletins dedupes via seenHashesRef, so it also picks up
  //    items left over from a previous visit — the random list persists in
  //    redux, and the server may return the same batch it already sent.
  useEffect(() => {
    if (!pendingRef.current) return
    pendingRef.current = false
    const newItems = filterVideoBulletins(RandomBulletinList)
    Logger.info(
      '[🎬 VideoFeedPage] random list response: total=' +
        RandomBulletinList.length +
        ', newVideoItems=' +
        newItems.length +
        ', emptyBatches=' +
        emptyBatchesRef.current
    )
    if (newItems.length > 0) {
      emptyBatchesRef.current = 0
      setFeedItems((prev) => [...prev, ...newItems.slice(0, TARGET - prev.length)])
    } else {
      emptyBatchesRef.current += 1
    }
    if (RandomBulletinList.length === lenBeforeRef.current) {
      // response arrived but added nothing new → server exhausted
      setNoMore(true)
    } else if (emptyBatchesRef.current >= MAX_EMPTY_BATCHES) {
      setNoMore(true)
    }
  }, [RandomBulletinList, filterVideoBulletins])

  // 3. Request batches while under TARGET
  const requestBatch = useCallback(() => {
    if (sourceMode === 'local') return
    if (RandomBulletinLoading || !MessengerConnStatus) {
      Logger.info(
        '[🎬 VideoFeedPage] requestBatch skipped: loading=' + RandomBulletinLoading + ', conn=' + MessengerConnStatus
      )
      return
    }
    Logger.info(
      '[🎬 VideoFeedPage] requestBatch: dispatching RequestRandomBulletin, listLen=' + RandomBulletinList.length
    )
    lenBeforeRef.current = RandomBulletinList.length
    pendingRef.current = true
    dispatch(RequestRandomBulletin())
  }, [RandomBulletinLoading, MessengerConnStatus, RandomBulletinList.length, dispatch, sourceMode])

  useEffect(() => {
    if (loading || noMore) return
    if (feedItems.length >= TARGET) return
    requestBatch()
  }, [loading, noMore, feedItems.length, requestBatch])

  // 3.5. Local mode: load local saved videos (once, into separate state)
  useEffect(() => {
    if (sourceMode !== 'local' || localLoaded) return
    Logger.info('[🎬 VideoFeedPage] local mode: loading saved local videos')
    ;(async () => {
      try {
        const localVideos = await dbAPI.getLocalVideoBulletins(50)
        const items = localVideos.map((lv) => ({ bulletin: lv, videoHash: lv.video_hash }))
        setLocalFeedItems(items)
        setLocalLoaded(true)
      } catch {
        // local load failed
      }
    })()
  }, [sourceMode, localLoaded])

  // Reset active index when switching modes
  useEffect(() => {
    setActiveIndex(0)
  }, [sourceMode])

  // Handle video ended in 'list' mode: advance to next (wrap around)
  const handleVideoEnded = useCallback(() => {
    if (playbackMode !== 'list') return
    const items = displayItems
    if (items.length === 0) return
    const nextIdx = (activeIndex + 1) % items.length
    setActiveIndex(nextIdx)
    // Scroll the container to the new item
    const el = itemRefs.current[nextIdx]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [playbackMode, displayItems, activeIndex])

  // 4. Local fallback: offline, or server exhausted, and still under TARGET
  useEffect(() => {
    if (loading || localTried) return
    if (feedItems.length >= TARGET) return
    if (MessengerConnStatus && !noMore) return
    Logger.info('[🎬 VideoFeedPage] local fallback triggered, feedItems=' + feedItems.length)
    setLocalTried(true)
    ;(async () => {
      try {
        const localVideos = await dbAPI.getLocalVideoBulletins(20)
        setFeedItems((prev) => {
          const items = [...prev]
          for (const lv of localVideos) {
            if (items.length >= TARGET) break
            if (seenHashesRef.current.has(lv.hash)) continue
            seenHashesRef.current.add(lv.hash)
            items.push({ bulletin: lv, videoHash: lv.video_hash })
          }
          return items
        })
      } catch {
        // local fallback failed — use what we have
      }
    })()
  }, [loading, localTried, feedItems.length, MessengerConnStatus, noMore])

  // --- Preload active+1/+2 (plan 2.3) ---
  useEffect(() => {
    if (displayItems.length === 0) return
    Logger.info('[🎬 VideoFeedPage] activeIndex=' + activeIndex + ', feedLen=' + displayItems.length)
    const items = []
    for (const idx of [activeIndex + 1, activeIndex + 2]) {
      const item = displayItems[idx]
      if (!item) continue
      const fs = FileStatusMap[item.videoHash]
      const saved = (fs && fs.is_saved) || FileSavedMap[item.videoHash] != null
      if (saved) continue
      if (fs && fs.length > 0 && !fs.failed) continue // download already in progress
      const videoFile = (item.bulletin.file || []).find((f) => f.Hash === item.videoHash)
      items.push({ hash: item.videoHash, size: videoFile ? videoFile.Size : 0 })
    }
    if (items.length > 0) {
      for (const it of items) requestedAtRef.current[it.hash] = Date.now()
      dispatch(VideoFeedPreload({ items }))
    }
  }, [activeIndex, displayItems, FileStatusMap, FileSavedMap, dispatch])

  // --- 15s watchdog (plan 2.3): the node may not have the file and never
  //     responds, so a download that produces no chunk must time out. ---
  //     - no status entry at all + 15s since request → mark failed (retryable)
  //     - status entry with a stalled cursor for 15s → re-request the chunk
  useEffect(() => {
    const timer = setInterval(() => {
      const item = displayItems[activeIndex]
      if (!item) return
      const hash = item.videoHash
      const fs = fileStatusRef.current[hash]
      const now = Date.now()
      if (fs && fs.is_saved) return
      if (fs && fs.length > 0 && !fs.failed) {
        const last = watchdogRef.current[hash]
        if (last && now - last.time >= WATCHDOG_MS && fs.cursor === last.cursor) {
          Logger.warn(
            '[🎬 VideoFeedPage] watchdog: stalled download hash=' +
              hash +
              ' cursor=' +
              fs.cursor +
              '/' +
              fs.length +
              ', re-requesting'
          )
          const videoFile = (item.bulletin.file || []).find((f) => f.Hash === hash)
          requestedAtRef.current[hash] = now
          dispatch(FetchBulletinFile({ hash, size: videoFile ? videoFile.Size : 0 }))
        }
        watchdogRef.current[hash] = { cursor: fs.cursor, time: now }
      } else if (!fs || (fs.length === 0 && !fs.failed)) {
        // No progress entry at all, or a request that was dispatched (status
        // entry with length 0) but never produced a chunk — the node may not
        // have the file and never responds.
        const requestedAt = requestedAtRef.current[hash]
        if (requestedAt && now - requestedAt >= WATCHDOG_MS) {
          Logger.warn('[🎬 VideoFeedPage] watchdog: no chunk received for hash=' + hash + ', marking failed')
          dispatch(setFileStatus({ hash, is_saved: false, cursor: 0, length: 0, failed: true }))
          delete requestedAtRef.current[hash]
        }
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [activeIndex, displayItems, dispatch])

  // --- IntersectionObserver for active item detection ---
  useEffect(() => {
    if (displayItems.length === 0) return
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = itemRefs.current.indexOf(entry.target)
            if (idx !== -1) {
              setActiveIndex(idx)
            }
          }
        }
      },
      { root: container, threshold: 0.6 }
    )

    itemRefs.current.forEach((el) => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [displayItems])

  // --- Load more when near the end (internet mode only) ---
  useEffect(() => {
    if (sourceMode === 'local') return
    if (feedItems.length === 0) return
    if (activeIndex >= feedItems.length - 2 && !noMore) {
      Logger.info('[🎬 VideoFeedPage] near end, requesting more: active=' + activeIndex + '/' + feedItems.length)
      requestBatch()
    }
  }, [activeIndex, feedItems.length, noMore, requestBatch, sourceMode])

  // --- Render ---
  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-white/50 text-lg">{t('video.loading')}</div>
      </div>
    )
  }

  if (displayItems.length === 0) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="text-white/50 text-lg">{t('video.empty')}</div>
        <button
          className="px-4 py-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-colors"
          onClick={goBack}
        >
          {t('common.back', 'Back')}
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden relative">
      {/* Back button */}
      <button
        className="absolute top-4 left-4 z-50 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
        onClick={goBack}
        aria-label={t('common.back', 'Back')}
      >
        <IoArrowBack className="text-xl" />
      </button>

      {/* Top-right controls: playback mode + source mode + mute toggle */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {/* Playback mode cycle: single → list → manual */}
        <button
          className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
          onClick={() =>
            setPlaybackMode(playbackMode === 'single' ? 'list' : playbackMode === 'list' ? 'manual' : 'single')
          }
          aria-label={playbackMode === 'single' ? 'Single loop' : playbackMode === 'list' ? 'List loop' : 'Manual'}
          title={playbackMode === 'single' ? '单曲循环' : playbackMode === 'list' ? '列表循环' : '手动切换'}
        >
          {playbackMode === 'single' ? (
            <IoRepeat className="text-xl" />
          ) : playbackMode === 'list' ? (
            <IoInfinite className="text-xl" />
          ) : (
            <IoHandLeft className="text-xl" />
          )}
        </button>
        {/* Source mode toggle: Internet / Local */}
        <button
          className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
          onClick={() => setSourceMode(sourceMode === 'internet' ? 'local' : 'internet')}
          aria-label={
            sourceMode === 'internet' ? t('video.source_internet', 'Internet') : t('video.source_local', 'Local')
          }
          title={sourceMode === 'internet' ? t('video.source_internet', 'Internet') : t('video.source_local', 'Local')}
        >
          {sourceMode === 'internet' ? <IoGlobe className="text-xl" /> : <IoServer className="text-xl" />}
        </button>
        {/* Mute toggle */}
        <button
          className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors backdrop-blur-sm"
          onClick={() => setIsMuted(!isMuted)}
          aria-label={isMuted ? t('video.unmute') : t('video.mute')}
        >
          {isMuted ? <IoVolumeMute className="text-xl" /> : <IoVolumeHigh className="text-xl" />}
        </button>
      </div>

      {/* Vertical feed */}
      <div ref={containerRef} className="h-full w-full overflow-y-auto snap-y snap-mandatory scroll-smooth">
        {displayItems.map((item, idx) => (
          <div
            key={item.bulletin.hash}
            ref={(el) => {
              itemRefs.current[idx] = el
            }}
            className="h-full w-full snap-start snap-always"
          >
            <VideoFeedItem
              bulletin={item.bulletin}
              videoHash={item.videoHash}
              isActive={idx === activeIndex}
              isMuted={isMuted}
              onStartDownload={startDownloadFor}
              forceSaved={sourceMode === 'local'}
              playbackMode={playbackMode}
              onVideoEnded={handleVideoEnded}
            />
          </div>
        ))}

        {/* Sentinel for loading more */}
        {!noMore && (
          <div className="h-16 flex items-center justify-center">
            <div className="text-white/30 text-sm">{t('page.loading_more')}</div>
          </div>
        )}
      </div>

      {/* Comment (publish-with-quote) and forward modals — rendered per page
          elsewhere, so the full-screen feed needs its own copies */}
      {showPublish && <BulletinPublish />}
      {showForward && <BulletinForward />}
    </div>
  )
}

export default VideoFeedPage
