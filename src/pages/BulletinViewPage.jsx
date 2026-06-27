import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { FiMessageSquare } from 'react-icons/fi'
import BulletinPublish from '../components/Bulletin/BulletinPublish'
import BulletinForward from '../components/Bulletin/BulletinForward'
import BulletinViewer from '../components/Bulletin/BulletinViewer'
import PageList from '../components/PageList'

export default function BulletinViewPage() {

  const [searchParams, setSearchParams] = useSearchParams()

  const bulletin_hash = searchParams.get('hash')
  const bulletin_address = searchParams.get('address')
  const bulletin_sequence = searchParams.get('sequence')
  const sour_address = searchParams.get('sour_address')

  const dispatch = useDispatch()

  // const { bulletin_hash } = useParams()
  const { ShowPublishFlag, ShowForwardFlag } = useSelector(state => state.Messenger)
  const { DisplayBulletin, DisplayBulletinReplyList, DisplayBulletinReplyPage, DisplayBulletinReplyTotalPage } = useSelector(state => state.Messenger)

  useEffect(() => {
    if (DisplayBulletin !== null && DisplayBulletin !== undefined && DisplayBulletin.hash === bulletin_hash) {
      dispatch({ type: 'RequestReplyBulletin', payload: { hash: DisplayBulletin.hash, page: 1 } })
    }
  }, [dispatch, DisplayBulletin])

  useEffect(() => {
    dispatch({
      type: 'LoadBulletin',
      payload: {
        hash: bulletin_hash,
        address: bulletin_address,
        sequence: parseInt(bulletin_sequence),
        to: sour_address
      }
    })
  }, [bulletin_hash])

  return (
    <div className="flex justify-center items-start">
      <div className="w-full max-w-6xl p-4 mt-2 rounded-xl card">
      {ShowPublishFlag && <BulletinPublish />}
      {ShowForwardFlag && <BulletinForward />}
      {DisplayBulletin !== null && DisplayBulletin !== undefined && (
        <BulletinViewer bulletin={DisplayBulletin} key={DisplayBulletin.hash} />
      )}
      {DisplayBulletinReplyList.length === 0 ? (
        <div className="empty-state-box mx-auto max-w-sm py-12">
          <FiMessageSquare className="text-4xl text-primary/30 dark:text-dark-primary/30 mb-2" />
          <h3 className='text-lg font-medium text-text-secondary dark:text-dark-text-secondary'>No replies yet</h3>
        </div>
      ) : (
        DisplayBulletinReplyList.map((bulletin) => (
          <BulletinViewer bulletin={bulletin} key={bulletin.hash} />
        ))
      )}
      {
        DisplayBulletinReplyTotalPage > 1 &&
        <PageList current_page={DisplayBulletinReplyPage} total_page={DisplayBulletinReplyTotalPage} dispatch_type={'RequestReplyBulletin'} payload={{ hash: DisplayBulletin.hash }} />
      }
    </div>
    </div>
  )
}