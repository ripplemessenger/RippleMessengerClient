import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import PageList from '../components/PageList'
import ListBulletin from '../components/Bulletin/ListBulletin'
import { IoStar } from 'react-icons/io5'

export default function BookmarkAddressPage() {
  const { Address } = useSelector(state => state.User)
  const { MessengerConnStatus, BookmarkBulletinList, BookmarkBulletinPage, BookmarkBulletinTotalPage, activeTabBulletin } = useSelector(state => state.Messenger)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    dispatch({ type: 'LoadBookmarkBulletin', payload: { page: 1 } })
  }, [dispatch])

  return (
    <div className="flex justify-center items-center w-full max-w-full overflow-hidden">
      <div className="tab-page">
        <div className="mx-auto w-full max-w-full min-w-0 flex flex-col mt-4">
          <div className="card-title  flex flex-row items-center">
            Bookmark
          </div>


          <div className="max-w-full min-w-0 p-4 rounded-xl card">
            {BookmarkBulletinTotalPage > 1 && (
              <PageList current_page={BookmarkBulletinPage} total_page={BookmarkBulletinTotalPage} dispatch_type={'LoadBookmarkBulletin'} payload={{}} />
            )}
            <div className={`mt-2 flex-1 justify-center min-w-0 overflow-hidden`}>
              {BookmarkBulletinList.length === 0 ? (
                <div className="empty-state-box mx-auto max-w-sm py-12">
                  <IoStar className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />
                  <h3 className='text-lg font-medium text-text-secondary dark:text-dark-text-secondary'>No bookmarked bulletins</h3>
                  <p className="text-sm text-text-secondary/60 dark:text-dark-text-secondary/60 mt-2">Bookmark bulletins to save them here</p>
                </div>
              ) : (
                BookmarkBulletinList.map((bulletin) => (
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