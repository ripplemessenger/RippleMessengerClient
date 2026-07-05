import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { FiMessageSquare } from 'react-icons/fi'

import BulletinForward from '../components/Bulletin/BulletinForward'
import BulletinPublish from '../components/Bulletin/BulletinPublish'
import BulletinViewer from '../components/Bulletin/BulletinViewer'
import EmptyState from '../components/EmptyState'
import ErrorBoundary from '../components/ErrorBoundary'
import LoadingDiv from '../components/LoadingDiv'
import PageList from '../components/PageList'
import { selectDisplayBulletins, selectPublishFlags } from '../selectors'
import { LoadBulletin, RequestReplyBulletin } from '../store/sagas/messenger.actions'

export default function BulletinViewPage() {
  const [searchParams] = useSearchParams()

  const bulletin_hash = searchParams.get('hash')
  const bulletin_address = searchParams.get('address')
  const bulletin_sequence = searchParams.get('sequence')
  const sour_address = searchParams.get('sour_address')

  const dispatch = useDispatch()

  const { ShowPublishFlag, ShowForwardFlag } = useSelector(selectPublishFlags)
  const { DisplayBulletin, DisplayBulletinReplyList, DisplayBulletinReplyPage, DisplayBulletinReplyTotalPage } = useSelector(selectDisplayBulletins)

  useEffect(() => {
    if (DisplayBulletin?.hash === bulletin_hash) {
      dispatch(RequestReplyBulletin({ hash: DisplayBulletin.hash, page: 1 }))
    }
  }, [dispatch, DisplayBulletin?.hash, bulletin_hash])

  useEffect(() => {
    dispatch(LoadBulletin({
      hash: bulletin_hash,
      address: bulletin_address,
      sequence: parseInt(bulletin_sequence),
      to: sour_address
    }))
  }, [bulletin_hash, bulletin_address, bulletin_sequence, sour_address])

  return (
    <div className="flex justify-center items-start">
      <div className="w-full max-w-6xl p-4 mt-2 rounded-xl card">
        <ErrorBoundary fallbackTitle="Bulletin View Error">
{ShowPublishFlag && <BulletinPublish />}
      {ShowForwardFlag && <BulletinForward />}
      {DisplayBulletin && (
        <BulletinViewer bulletin={DisplayBulletin} key={DisplayBulletin.hash} />
      )}
      {DisplayBulletinReplyList.length > 0 &&
        DisplayBulletinReplyList.map((bulletin) => (
          <BulletinViewer bulletin={bulletin} key={bulletin.hash} />
        ))
      }
      {DisplayBulletinReplyList.length === 0 && !(!DisplayBulletin && bulletin_hash) && (
        <EmptyState
          icon={<FiMessageSquare className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
          title="No replies yet"
        />
      )}
      {!DisplayBulletin && bulletin_hash && (
        <LoadingDiv isLoading={true} text="Loading bulletin..." />
      )}
      {
        DisplayBulletin && DisplayBulletinReplyTotalPage > 1 &&
        <PageList current_page={DisplayBulletinReplyPage} total_page={DisplayBulletinReplyTotalPage} dispatch_type={'RequestReplyBulletin'} payload={{ hash: DisplayBulletin.hash }} />
      }
        </ErrorBoundary>
      </div>
    </div>
  )
}