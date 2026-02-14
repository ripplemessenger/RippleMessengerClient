import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useSearchParams } from 'react-router-dom'
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
    if (DisplayBulletin !== null && DisplayBulletin !== undefined) {
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
    <div className="p-1 mt-2 card">
      {
        ShowPublishFlag &&
        <BulletinPublish />
      }
      {
        ShowForwardFlag &&
        <BulletinForward />
      }
      {
        DisplayBulletinReplyTotalPage > 1 &&
        <PageList current_page={DisplayBulletinReplyPage} total_page={DisplayBulletinReplyTotalPage} dispatch_type={'RequestReplyBulletin'} payload={{ hash: DisplayBulletin.hash }} />
      }
      {
        DisplayBulletin !== null && DisplayBulletin !== undefined &&
        <BulletinViewer bulletin={DisplayBulletin} />
      }
      {
        DisplayBulletinReplyList.length === 0 ?
          <div className="mx-auto rounded-full p-1 border-2 border-gray-200 dark:border-gray-700 px-4">
            <h3 className='text-2xl text-gray-500 dark:text-gray-200'>
              no reply yet...
            </h3>
          </div>
          :
          DisplayBulletinReplyList.map((bulletin, index) => (
            <div key={bulletin.hash} >
              <BulletinViewer bulletin={bulletin} />
            </div>
          ))
      }
      {
        DisplayBulletinReplyTotalPage > 1 &&
        <PageList current_page={DisplayBulletinReplyPage} total_page={DisplayBulletinReplyTotalPage} dispatch_type={'RequestReplyBulletin'} payload={{ hash: DisplayBulletin.hash }} />
      }
    </div >
  )
}