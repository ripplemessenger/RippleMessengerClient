import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { BulletinPageTab } from '../../lib/AppConst'
import ListBulletin from '../../components/Bulletin/ListBulletin'
import { setPublishFlag } from '../../store/slices/MessengerSlice'
import { MdPostAdd } from "react-icons/md"

export default function TabMine() {
  const { Address } = useSelector(state => state.User)
  const { MessengerConnStatus, MineBulletinList, activeTabBulletin } = useSelector(state => state.Messenger)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    if (Address !== undefined && Address !== null && activeTabBulletin === BulletinPageTab.Mine) {
      dispatch({ type: 'LoadMineBulletin' })
    }
  }, [dispatch, Address, activeTabBulletin, MessengerConnStatus])

  return (
    <div className="flex justify-center items-center">
      <div className="tab-page">
        <div className="mx-auto w-full flex flex-col mt-4">
          <div className="card-title  row-center-middle">
            {BulletinPageTab.Mine}
            <MdPostAdd className="card-icon" onClick={() => dispatch(setPublishFlag(true))} />
          </div>


          <div className={`mt-1 flex-1 justify-center`}>
            {
              MineBulletinList.length === 0 ?
                <div className="mx-auto rounded-full p-1 border-2 border-gray-200 dark:border-gray-700 px-4">
                  <h3 className='text-2xl text-gray-500 dark:text-gray-200'>
                    no bulletin yet...
                  </h3>
                </div>
                :
                MineBulletinList.map((bulletin, index) => (
                  <div key={bulletin.Hash} className='text-xs text-gray-200 mt-1 p-1'>
                    <ListBulletin bulletin={bulletin} />
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}