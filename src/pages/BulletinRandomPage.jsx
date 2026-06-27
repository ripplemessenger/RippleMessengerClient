import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { IoMdRefresh } from "react-icons/io"
import ListBulletin from '../components/Bulletin/ListBulletin'

export default function BulletinRandomPage() {
  const { Address } = useSelector(state => state.User)
  const { MessengerConnStatus, RandomBulletinList, ShowPublishFlag, ShowForwardFlag } = useSelector(state => state.Messenger)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    dispatch({ type: 'RequestRandomBulletin' })
  }, [dispatch, Address, MessengerConnStatus])


  return (
    <div className="flex justify-center items-center w-full max-w-full overflow-hidden">
      {
        ShowPublishFlag &&
        <BulletinPublish />
      }
      {
        ShowForwardFlag &&
        <BulletinForward />
      }
      <div className="tab-page">
        <div className="mx-auto w-full max-w-full min-w-0 flex flex-col mt-4">
          <div className="card-title flex flex-row items-center">
            Random
            <IoMdRefresh className="card-icon" onClick={() => dispatch({ type: 'RequestRandomBulletin' })} />
          </div>

          <div className="max-w-full min-w-0 p-4 rounded-xl card overflow-hidden">
            <div className={`mt-2 flex-1 justify-center min-w-0 overflow-hidden`}>
              {RandomBulletinList.length === 0 ? (
                <div className="empty-state-box mx-auto max-w-sm py-12">
                  <IoMdRefresh className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />
                  <h3 className='text-lg font-medium text-text-secondary dark:text-dark-text-secondary'>No random bulletins</h3>
                  <p className="text-sm text-text-secondary/60 dark:text-dark-text-secondary/60 mt-2">Refresh to discover random posts</p>
                </div>
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