import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { IoMdRefresh } from 'react-icons/io'

import RandomBulletinCard from './RandomBulletinCard'
import EmptyState from '../EmptyState'
import { RequestRandomBulletin } from '../../store/sagas/messenger.actions'
import { setRandomBulletinList } from '../../store/slices/MessengerSlice'

/**
 * Infinite random bulletin feed (3-column masonry, Xiaohongshu/Douyin style).
 * Self-contained: loads on mount, appends + dedupes by hash on scroll,
 * stops when a batch adds nothing new. Refresh clears and restarts.
 */
export default function RandomFeed() {
  const { t } = useTranslation()
  const { MessengerConnStatus, RandomBulletinList, RandomBulletinLoading } = useSelector((state) => state.Messenger)

  const dispatch = useDispatch()

  const [noMore, setNoMore] = useState(false)
  const sentinelRef = useRef(null)
  const lenBeforeRef = useRef(0)
  const pendingRef = useRef(false)

  const requestMore = useCallback(() => {
    lenBeforeRef.current = RandomBulletinList.length
    pendingRef.current = true
    dispatch(RequestRandomBulletin())
  }, [dispatch, RandomBulletinList.length])

  // Initial load
  useEffect(() => {
    if (MessengerConnStatus) {
      requestMore()
    }
  }, [MessengerConnStatus])

  // Detect "response arrived but added nothing new" → stop the feed
  useEffect(() => {
    if (!pendingRef.current) return
    if (!RandomBulletinLoading && RandomBulletinList.length === lenBeforeRef.current) {
      setNoMore(true)
    }
    pendingRef.current = false
  }, [RandomBulletinLoading, RandomBulletinList.length])

  // Infinite scroll — sentinel near the bottom triggers the next batch
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || noMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !RandomBulletinLoading && MessengerConnStatus) {
          requestMore()
        }
      },
      { rootMargin: '300px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [RandomBulletinLoading, noMore, MessengerConnStatus, requestMore])

  const handleRefresh = useCallback(() => {
    setNoMore(false)
    dispatch(setRandomBulletinList([]))
    lenBeforeRef.current = 0
    pendingRef.current = true
    dispatch(RequestRandomBulletin())
  }, [dispatch])

  return (
    <div className="mt-2 flex-1 min-w-0 overflow-hidden flex flex-col">
      {/* Feed body */}
      {RandomBulletinList.length === 0 && !RandomBulletinLoading ? (
        <div className="flex-1 flex justify-center">
          <EmptyState
            icon={<IoMdRefresh className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
            title={t('page.no_random_bulletins')}
            description={t('page.refresh_to_discover')}
          />
        </div>
      ) : (
        <>
          <div className="w-full">
            <div className="columns-3 gap-3 max-w-5xl mx-auto">
              {RandomBulletinList.map((bulletin) => (
                <RandomBulletinCard key={bulletin.hash} bulletin={bulletin} />
              ))}
            </div>
          </div>

          {/* Sentinel + bottom status */}
          <div ref={sentinelRef} className="flex items-center justify-center py-4">
            {RandomBulletinLoading ? (
              <span className="text-sm text-text-secondary dark:text-dark-text-secondary">
                {t('page.loading_more')}
              </span>
            ) : noMore ? (
              <span className="text-sm text-text-secondary/60 dark:text-dark-text-secondary/60">
                {t('page.no_more_new')}
              </span>
            ) : null}
          </div>
        </>
      )}

      {/* Floating Action Button — refresh (same style as the publish FAB on the bulletin page) */}
      <button
        onClick={handleRefresh}
        aria-label={t('common.refresh')}
        title={t('common.refresh')}
        className="fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <IoMdRefresh className="w-7 h-7" />
      </button>
    </div>
  )
}
