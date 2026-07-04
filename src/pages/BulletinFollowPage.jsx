import { useSelector } from 'react-redux'
import { SlUserFollowing } from 'react-icons/sl'

import BulletinForward from '../components/Bulletin/BulletinForward'
import BulletinPublish from '../components/Bulletin/BulletinPublish'
import BulletinListPage from '../components/Bulletin/BulletinListPage'
import { selectFollowBulletins, selectPublishFlags } from '../selectors'
import { useBulletinLoad } from '../hooks/useBulletinLoad'

export default function BulletinFollowPage() {
  useBulletinLoad('LoadFollowBulletin')

  const { list: FollowBulletinList, totalPage: FollowBulletinTotalPage, page: FollowBulletinPage } = useSelector(selectFollowBulletins)
  const { showPublish: ShowPublishFlag, showForward: ShowForwardFlag } = useSelector(selectPublishFlags)

  return (
    <div className="bulletin-page-wrapper">
      {ShowPublishFlag && <BulletinPublish />}
      {ShowForwardFlag && <BulletinForward />}
      <BulletinListPage
        title="Follow"
        bulletins={FollowBulletinList}
        bulletinData={{ page: FollowBulletinPage, totalPage: FollowBulletinTotalPage }}
        pageListType={'LoadFollowBulletin'}
        pageListPayload={{}}
        showEmpty
        emptyIcon={<SlUserFollowing className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
        emptyTitle="No followed bulletins"
        emptyDescription="Enable follow on a contact to see their bulletins here"
        renderWrapper={false}
      />
    </div>
  )
}
