import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdPostAdd } from 'react-icons/md'

import AvatarName from '../components/AvatarName'
import BulletinForward from '../components/Bulletin/BulletinForward'
import BulletinPublish from '../components/Bulletin/BulletinPublish'
import EmptyState from '../components/EmptyState'
import ListBulletin from '../components/Bulletin/ListBulletin'
import PageList from '../components/PageList'
import { useUserAddress } from '../hooks/useUserSelectors'
import { setPublishFlag } from '../store/slices/MessengerSlice'

export default function BulletinAddressPage() {
  const Address = useUserAddress()
  const { AddressBulletinList, AddressBulletinTotalPage, AddressBulletinPage, BulletinAddress, ShowPublishFlag, ShowForwardFlag, MessengerConnStatus } = useSelector(state => state.Messenger)

  const dispatch = useDispatch()

  useEffect(() => {
    if (BulletinAddress !== null) {
      dispatch({ type: 'LoadAddressBulletin', payload: { address: BulletinAddress, page: 1 } })
    }
  }, [dispatch, BulletinAddress, MessengerConnStatus])

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
          <div className="card-title flex flex-row items-center">
            <AvatarName address={BulletinAddress} />
            {BulletinAddress === Address &&
              <button className="icon-action-btn" onClick={() => dispatch(setPublishFlag(true))} aria-label="Publish bulletin">
                <MdPostAdd className="card-icon" />
              </button>
            }
          </div>

          <div className="bulletin-card-list">
            {AddressBulletinTotalPage > 1 && (
              <PageList current_page={AddressBulletinPage} total_page={AddressBulletinTotalPage} dispatch_type={'LoadAddressBulletin'} payload={{ address: BulletinAddress }} />
            )}
            <div className={`bulletin-list-content`}>
              {AddressBulletinList.length === 0 ? (
                <EmptyState
                  icon={<MdPostAdd className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
                  title="No bulletins from this account"
                  description="This account has not posted yet"
                />
              ) : (
                AddressBulletinList.map((bulletin) => (
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