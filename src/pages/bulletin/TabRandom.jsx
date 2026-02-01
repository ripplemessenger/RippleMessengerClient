import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { BulletinPageTab } from '../../lib/AppConst'
import { IoMdRefresh } from "react-icons/io"
import BulletinViewer from '../../components/Bulletin/BulletinViewer'

export default function TabRandom() {
  const [bulletin, setBulletin] = useState(null)
  const { Address } = useSelector(state => state.User)
  const { MessengerConnStatus, RandomBulletin, activeTabBulletin } = useSelector(state => state.Messenger)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    if (Address !== undefined && Address !== null && activeTabBulletin === BulletinPageTab.Random) {
      dispatch({ type: 'RequestRandomBulletin' })
    }
  }, [dispatch, Address, activeTabBulletin, MessengerConnStatus])

  useEffect(() => {
    if (RandomBulletin !== null) {
      setBulletin(RandomBulletin)
    }
  }, [RandomBulletin])

  return (
    <div className="flex justify-center items-center">
      <div className="tab-page">
        <div className="mx-auto w-full flex flex-col mt-4">
          <div className="card-title row-center-middle">
            {BulletinPageTab.Random}
            <IoMdRefresh className="card-icon" onClick={() => dispatch({ type: 'RequestRandomBulletin' })} />
          </div>

          <div className={`mt-1 flex-1 justify-center`}>
            {
              bulletin !== null &&
              <div key={bulletin.Hash}>
                <BulletinViewer bulletin={bulletin} />
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}