import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import ListBulletin from '../components/Bulletin/ListBulletin'
import PageList from '../components/PageList'
import BulletinPublish from '../components/Bulletin/BulletinPublish'
import BulletinForward from '../components/Bulletin/BulletinForward'
import AvatarName from '../components/AvatarName'
import { setPublishFlag } from '../store/slices/MessengerSlice'
import { MdPostAdd } from 'react-icons/md'

export default function BulletinAddressPage() {
  const { Address } = useSelector(state => state.User)
  const { AddressBulletinList, AddressBulletinTotalPage, AddressBulletinPage, BulletinAddress, ShowPublishFlag, ShowForwardFlag, MessengerConnStatus } = useSelector(state => state.Messenger)

  const dispatch = useDispatch()

  useEffect(() => {
    if (BulletinAddress !== null) {
      dispatch({ type: 'LoadAddressBulletin', payload: { address: BulletinAddress, page: 1 } })
    }
  }, [dispatch, BulletinAddress, MessengerConnStatus])

  return (
    <div className="flex justify-center items-center w-full max-w-full overflow-hidden">
      {
        ShowPublishFlag &&
        <BulletinPublish />
      }
      {
        ShowForwardFlag &&
        <BulletinForward />
      }
      <div className="tab-page">
        <div className="mx-auto w-full max-w-full min-w-0 flex flex-col mt-4">
          <div className="card-title flex flex-row items-center">
            <AvatarName address={BulletinAddress} />
            {BulletinAddress === Address &&
              < MdPostAdd className="card-icon" onClick={() => dispatch(setPublishFlag(true))} />
            }
          </div>

          <div className="max-w-full min-w-0 p-4 rounded-xl card overflow-hidden">
            {AddressBulletinTotalPage > 1 && (
              <PageList current_page={AddressBulletinPage} total_page={AddressBulletinTotalPage} dispatch_type={'LoadAddressBulletin'} payload={{ address: BulletinAddress }} />
            )}
            <div className={`mt-2 flex-1 justify-center min-w-0 overflow-hidden`}>
              {AddressBulletinList.length === 0 ? (
                <div className="empty-state-box mx-auto max-w-sm py-12">
                  <MdPostAdd className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />
                  <h3 className='text-lg font-medium text-text-secondary dark:text-dark-text-secondary'>No bulletins from this account</h3>
                  <p className="text-sm text-text-secondary/60 dark:text-dark-text-secondary/60 mt-2">This account has not posted yet</p>
                </div>
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