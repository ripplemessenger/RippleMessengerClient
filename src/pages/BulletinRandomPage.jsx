import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { IoMdRefresh } from 'react-icons/io'

import BulletinForward from '../components/Bulletin/BulletinForward'
import BulletinPublish from '../components/Bulletin/BulletinPublish'
import EmptyState from '../components/EmptyState'
import ListBulletin from '../components/Bulletin/ListBulletin'

export default function BulletinRandomPage() {
  const { MessengerConnStatus, RandomBulletinList, ShowPublishFlag, ShowForwardFlag } = useSelector(state => state.Messenger)

  const dispatch = useDispatch()

  useEffect(() => {
    dispatch({ type: 'RequestRandomBulletin' })
  }, [dispatch, MessengerConnStatus])


  return (
    <div className="bulletin-page-wrapper">
      {
        ShowPublishFlag &&
        <BulletinPublish />
      }
      {
        ShowForwardFlag &&
        <BulletinForward />
      }
      <div className="tab-page">
        <div className="bulletin-page-inner">
          <div className="card-title flex flex-row items-center">
            Random
            <button className="icon-action-btn" onClick={() => dispatch({ type: 'RequestRandomBulletin' })} aria-label="Refresh">
              <IoMdRefresh className="card-icon" />
            </button>
          </div>

          <div className="bulletin-card-list">
            <div className={`bulletin-list-content`}>
              {RandomBulletinList.length === 0 ? (
                <EmptyState
                  icon={<IoMdRefresh className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
                  title="No random bulletins"
                  description="Refresh to discover random posts"
                />
              ) : (
                RandomBulletinList.map((bulletin) => (
                  <ListBulletin key={bulletin.hash} bulletin={bulletin} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}