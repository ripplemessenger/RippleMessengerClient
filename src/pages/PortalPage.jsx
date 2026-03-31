import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import ListBulletin from '../components/Bulletin/ListBulletin'
import PageList from '../components/PageList'
import BulletinPublish from '../components/Bulletin/BulletinPublish'
import BulletinForward from '../components/Bulletin/BulletinForward'
import { setPasteFlag, setPublishFlag, setSearchTagList } from '../store/slices/MessengerSlice'
import { MdPostAdd } from 'react-icons/md'
import { IoStar } from "react-icons/io5"
import { HiHashtag } from "react-icons/hi2"
import { BiSolidFileJson } from "react-icons/bi"
import { SlUserFollowing } from "react-icons/sl"
import { GiPerspectiveDiceSixFacesRandom } from "react-icons/gi"
import BulletinPaste from '../components/Bulletin/BulletinPaste'

export default function PortalPage() {
  const { PortalBulletinList, PortalBulletinTotalPage, PortalBulletinPage } = useSelector(state => state.Messenger)
  const { ShowPublishFlag, ShowForwardFlag, ShowPasteFlag } = useSelector(state => state.Messenger)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const goto_tag = async () => {
    dispatch(setSearchTagList([]))
    navigate('/bulletin_tag')
  }

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
      {
        ShowPasteFlag &&
        <BulletinPaste />
      }
      <div className="tab-page">
        <div className="mx-auto flex flex-col mt-4">
          <div className="card-title row-center-middle">
            Portal
            <MdPostAdd className="card-icon" onClick={() => dispatch(setPublishFlag(true))} />
            <SlUserFollowing className="card-icon" onClick={() => navigate('/bulletin_follow')} />
            <HiHashtag className="card-icon" onClick={() => goto_tag()} />
            <IoStar className="card-icon" onClick={() => navigate('/bulletin_bookmark')} />
            <GiPerspectiveDiceSixFacesRandom className="card-icon" onClick={() => navigate('/bulletin_random')} />
            <BiSolidFileJson className="card-icon" onClick={() => dispatch(setPasteFlag(true))} />
          </div>

          <div className="min-w-full p-2 rounded-lg shadow-xl justify-center">
            {
              PortalBulletinTotalPage > 1 &&
              <PageList current_page={PortalBulletinPage} total_page={PortalBulletinTotalPage} dispatch_type={'LoadPortalBulletin'} payload={{}} />
            }
            <div className={`mt-1 flex-1 justify-center`}>
              {
                PortalBulletinList.length === 0 ?
                  <div className="mx-auto rounded-full p-1 border-2 border-gray-200 dark:border-gray-700 px-4">
                    <h3 className='text-2xl text-gray-500 dark:text-gray-200'>
                      no bulletin yet...
                    </h3>
                  </div>
                  :
                  PortalBulletinList.map((bulletin, index) => (
                    <div key={bulletin.hash} className='text-xs text-gray-200 mt-1 p-1'>
                      <ListBulletin bulletin={bulletin} />
                    </div>
                  ))
              }
            </div>
            {
              PortalBulletinTotalPage > 1 &&
              <PageList current_page={PortalBulletinPage} total_page={PortalBulletinTotalPage} dispatch_type={'LoadPortalBulletin'} payload={{}} />
            }
          </div>
        </div>
      </div>
    </div >
  )
}