import { useSelector } from 'react-redux'
import { SlUserFollowing } from 'react-icons/sl'

import BulletinForward from '../components/Bulletin/BulletinForward'
import BulletinPublish from '../components/Bulletin/BulletinPublish'
import ListBulletin from '../components/Bulletin/ListBulletin'
import EmptyState from '../components/EmptyState'
import PageList from '../components/PageList'
import { selectFollowBulletins, selectPublishFlags } from '../selectors'
import { useBulletinLoad } from '../hooks/useBulletinLoad'

export default function BulletinFollowPage() {
  useBulletinLoad('LoadFollowBulletin')

  const { list: FollowBulletinList, totalPage: FollowBulletinTotalPage, page: FollowBulletinPage } = useSelector(selectFollowBulletins)
  const { showPublish: ShowPublishFlag, showForward: ShowForwardFlag } = useSelector(selectPublishFlags)

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
          <div className="card-title">
            Follow
          </div>

          <div className="bulletin-card-list">
            {FollowBulletinTotalPage > 1 && (
              <PageList current_page={FollowBulletinPage} total_page={FollowBulletinTotalPage} dispatch_type={'LoadFollowBulletin'} payload={{}} />
            )}
            <div className={`bulletin-list-content`}>
              {FollowBulletinList.length === 0 ? (
                <EmptyState
                  icon={<SlUserFollowing className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
                  title="No followed bulletins"
                  description="Enable follow on a contact to see their bulletins here"
                />
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