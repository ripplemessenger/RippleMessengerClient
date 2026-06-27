import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import ListBulletin from '../components/Bulletin/ListBulletin'
import PageList from '../components/PageList'
import BulletinForward from '../components/Bulletin/BulletinForward'
import BulletinPublish from '../components/Bulletin/BulletinPublish'
import { SlUserFollowing } from 'react-icons/sl'

export default function BulletinFollowPage() {
  const { Address } = useSelector(state => state.User)
  const { FollowBulletinList, FollowBulletinTotalPage, FollowBulletinPage, ShowPublishFlag, ShowForwardFlag, MessengerConnStatus } = useSelector(state => state.Messenger)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    if (Address !== null) {
      dispatch({ type: 'LoadFollowBulletin', payload: { page: 1 } })
    }
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
          <div className="card-title">
            Follow
          </div>

          <div className="max-w-full min-w-0 p-4 rounded-xl card overflow-hidden">
            {FollowBulletinTotalPage > 1 && (
              <PageList current_page={FollowBulletinPage} total_page={FollowBulletinTotalPage} dispatch_type={'LoadFollowBulletin'} payload={{}} />
            )}
            <div className={`mt-2 flex-1 justify-center min-w-0 overflow-hidden`}>
              {FollowBulletinList.length === 0 ? (
                <div className="empty-state-box mx-auto max-w-sm py-12">
                  <SlUserFollowing className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />
                  <h3 className='text-lg font-medium text-text-secondary dark:text-dark-text-secondary'>No followed bulletins</h3>
                  <p className="text-sm text-text-secondary/60 dark:text-dark-text-secondary/60 mt-2">Enable follow on a contact to see their bulletins here</p>
                </div>
              ) : (
                FollowBulletinList.map((bulletin) => (
                  <ListBulletin key={bulletin.hash} bulletin={bulletin} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div >
  )
}