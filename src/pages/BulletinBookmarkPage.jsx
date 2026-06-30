import { useSelector } from 'react-redux'
import PageList from '../components/PageList'
import ListBulletin from '../components/Bulletin/ListBulletin'
import { IoStar } from 'react-icons/io5'
import EmptyState from '../components/EmptyState'
import { useBulletinLoad } from '../hooks/useBulletinLoad'

export default function BookmarkAddressPage() {
  useBulletinLoad('LoadBookmarkBulletin', { page: 1 })

  const { BookmarkBulletinList, BookmarkBulletinPage, BookmarkBulletinTotalPage } = useSelector(state => state.Messenger)

  return (
    <div className="bulletin-page-wrapper">
      <div className="tab-page">
        <div className="bulletin-page-inner">
          <div className="card-title  flex flex-row items-center">
            Bookmark
          </div>


          <div className="max-w-full min-w-0 p-4 rounded-xl card">
            {BookmarkBulletinTotalPage > 1 && (
              <PageList current_page={BookmarkBulletinPage} total_page={BookmarkBulletinTotalPage} dispatch_type={'LoadBookmarkBulletin'} payload={{}} />
            )}
            <div className={`bulletin-list-content`}>
              {BookmarkBulletinList.length === 0 ? (
                <EmptyState
                  icon={<IoStar className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
                  title="No bookmarked bulletins"
                  description="Bookmark bulletins to save them here"
                />
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