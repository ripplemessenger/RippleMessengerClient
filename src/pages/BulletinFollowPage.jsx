import { useSelector } from 'react-redux'
import { SlUserFollowing } from 'react-icons/sl'
import { useTranslation } from 'react-i18next'

import BulletinForward from '../components/Bulletin/BulletinForward'
import BulletinPublish from '../components/Bulletin/BulletinPublish'
import BulletinListPage from '../components/Bulletin/BulletinListPage'
import { selectFollowBulletins, selectPublishFlags } from '../selectors'
import { useBulletinLoad } from '../hooks/useBulletinLoad'

export default function BulletinFollowPage() {
  const { t } = useTranslation()
  useBulletinLoad('LoadFollowBulletin')

  const {
    list: FollowBulletinList,
    totalPage: FollowBulletinTotalPage,
    page: FollowBulletinPage
  } = useSelector(selectFollowBulletins)
  const { showPublish: ShowPublishFlag, showForward: ShowForwardFlag } = useSelector(selectPublishFlags)

  return (
    <div className="bulletin-page-wrapper">
      {ShowPublishFlag && <BulletinPublish />}
      {ShowForwardFlag && <BulletinForward />}
      <BulletinListPage
        title={t('common.follow')}
        bulletins={FollowBulletinList}
        bulletinData={{ page: FollowBulletinPage, totalPage: FollowBulletinTotalPage }}
        pageListType={'LoadFollowBulletin'}
        pageListPayload={{}}
        showEmpty
        emptyIcon={<SlUserFollowing className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
        emptyTitle={t('page.no_followed_bulletins')}
        emptyDescription={t('page.enable_follow_to_see')}
        renderWrapper={false}
      />
    </div>
  )
}
