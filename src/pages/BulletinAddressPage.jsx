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
    <div className="flex justify-center items-center">
      {
        ShowPublishFlag &&
        <BulletinPublish />
      }
      {
        ShowForwardFlag &&
        <BulletinForward />
      }
      <div className="tab-page">
        <div className="mx-auto flex flex-col mt-4">
          <div className="card-title row-center-middle">
            <AvatarName address={BulletinAddress} />
            {BulletinAddress === Address &&
              < MdPostAdd className="card-icon" onClick={() => dispatch(setPublishFlag(true))} />
            }
          </div>

          <div className="min-w-full p-2 rounded-lg shadow-xl justify-center">
            {
              AddressBulletinTotalPage > 1 &&
              <PageList current_page={AddressBulletinPage} total_page={AddressBulletinTotalPage} dispatch_type={'LoadAddressBulletin'} payload={{ address: BulletinAddress }} />
            }
            <div className={`mt-1 flex-1 justify-center`}>
              {
                AddressBulletinList.length === 0 ?
                  <div className="mx-auto rounded-full p-1 border-2 border-gray-200 dark:border-gray-700 px-4">
                    <h3 className='text-2xl text-gray-500 dark:text-gray-200'>
                      no bulletin yet...
                    </h3>
                  </div>
                  :
                  AddressBulletinList.map((bulletin, index) => (
                    <div key={bulletin.hash} className='text-xs text-gray-200 mt-1 p-1'>
                      <ListBulletin bulletin={bulletin} />
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </div>
    </div >
  )
}