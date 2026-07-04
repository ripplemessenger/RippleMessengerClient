import { useSelector } from 'react-redux'
import { IoStar } from 'react-icons/io5'

import BulletinListPage from '../components/Bulletin/BulletinListPage'
import { selectBookmarkBulletins } from '../selectors'
import { useBulletinLoad } from '../hooks/useBulletinLoad'

export default function BookmarkAddressPage() {
  useBulletinLoad('LoadBookmarkBulletin', { page: 1 })

  const { list: BookmarkBulletinList, page: BookmarkBulletinPage, totalPage: BookmarkBulletinTotalPage } = useSelector(selectBookmarkBulletins)

  return (
    <BulletinListPage
      title="Bookmark"
      bulletins={BookmarkBulletinList}
      bulletinData={{ page: BookmarkBulletinPage, totalPage: BookmarkBulletinTotalPage }}
      pageListType={'LoadBookmarkBulletin'}
      pageListPayload={{}}
      wrapperStyle={'card'}
      showEmpty
      emptyIcon={<IoStar className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
      emptyTitle="No bookmarked bulletins"
      emptyDescription="Bookmark bulletins to save them here"
    />
  )
}
