import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdPostAdd } from 'react-icons/md'

import AvatarName from '../components/AvatarName'
import BulletinForward from '../components/Bulletin/BulletinForward'
import BulletinPublish from '../components/Bulletin/BulletinPublish'
import BulletinListPage from '../components/Bulletin/BulletinListPage'
import { selectUserAddress, selectBulletinAddressData } from '../selectors'
import { setPublishFlag } from '../store/slices/MessengerSlice'
import { LoadAddressBulletin } from '../store/sagas/messenger.actions'

export default function BulletinAddressPage() {
  const Address = useSelector(selectUserAddress)
  const { AddressBulletinList, AddressBulletinTotalPage, AddressBulletinPage, BulletinAddress, ShowPublishFlag, ShowForwardFlag, MessengerConnStatus } = useSelector(selectBulletinAddressData)

  const dispatch = useDispatch()

  useEffect(() => {
    if (BulletinAddress !== null) {
      dispatch(LoadAddressBulletin({ address: BulletinAddress, page: 1 }))
    }
  }, [dispatch, BulletinAddress, MessengerConnStatus])

  return (
    <div className="bulletin-page-wrapper">
      {ShowPublishFlag && <BulletinPublish />}
      {ShowForwardFlag && <BulletinForward />}
      <BulletinListPage
        title={
          <>
            <AvatarName address={BulletinAddress} />
            {BulletinAddress === Address &&
              <button className="icon-action-btn" onClick={() => dispatch(setPublishFlag(true))} aria-label="Publish bulletin">
                <MdPostAdd className="card-icon" />
              </button>
            }
          </>
        }
        bulletins={AddressBulletinList}
        bulletinData={{ page: AddressBulletinPage, totalPage: AddressBulletinTotalPage }}
        pageListType={'LoadAddressBulletin'}
        pageListPayload={{ address: BulletinAddress }}
        showEmpty
        emptyIcon={<MdPostAdd className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
        emptyTitle="No bulletins from this account"
        emptyDescription="This account has not posted yet"
        renderWrapper={false}
      />
    </div>
  )
}
