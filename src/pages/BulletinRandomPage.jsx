import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { IoMdRefresh } from 'react-icons/io'

import BulletinForward from '../components/Bulletin/BulletinForward'
import BulletinPublish from '../components/Bulletin/BulletinPublish'
import BulletinListPage from '../components/Bulletin/BulletinListPage'
import { RequestRandomBulletin } from '../store/sagas/messenger.actions'

export default function BulletinRandomPage() {
  const { t } = useTranslation()
  const { MessengerConnStatus, RandomBulletinList, ShowPublishFlag, ShowForwardFlag } = useSelector(
    (state) => state.Messenger
  )

  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(RequestRandomBulletin())
  }, [dispatch, MessengerConnStatus])

  return (
    <div className="bulletin-page-wrapper">
      {ShowPublishFlag && <BulletinPublish />}
      {ShowForwardFlag && <BulletinForward />}
      <BulletinListPage
        title={
          <>
            {t('page.random')}
            <button
              className="icon-action-btn"
              onClick={() => dispatch(RequestRandomBulletin())}
              aria-label={t('common.refresh')}
            >
              <IoMdRefresh className="card-icon" />
            </button>
          </>
        }
        bulletins={RandomBulletinList}
        showEmpty
        emptyIcon={<IoMdRefresh className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
        emptyTitle={t('page.no_random_bulletins')}
        emptyDescription={t('page.refresh_to_discover')}
        renderWrapper={false}
      />
    </div>
  )
}
