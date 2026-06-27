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
    <div className="flex justify-center items-center w-full max-w-full overflow-hidden">
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
        <div className="mx-auto w-full max-w-full min-w-0 flex flex-col mt-4">
          <div className="card-title flex flex-row items-center">
            Portal
            <MdPostAdd className="card-icon" onClick={() => dispatch(setPublishFlag(true))} />
            <SlUserFollowing className="card-icon" onClick={() => navigate('/bulletin_follow')} />
            <HiHashtag className="card-icon" onClick={() => goto_tag()} />
            <IoStar className="card-icon" onClick={() => navigate('/bulletin_bookmark')} />
            <GiPerspectiveDiceSixFacesRandom className="card-icon" onClick={() => navigate('/bulletin_random')} />
            <BiSolidFileJson className="card-icon" onClick={() => dispatch(setPasteFlag(true))} />
          </div>

          <div className="max-w-full min-w-0 p-4 rounded-xl card overflow-hidden">
            {
              PortalBulletinTotalPage > 1 &&
              <PageList current_page={PortalBulletinPage} total_page={PortalBulletinTotalPage} dispatch_type={'LoadPortalBulletin'} payload={{}} />
            }
            <div className={`mt-2 flex-1 justify-center min-w-0 overflow-hidden`}>
              {
                PortalBulletinList.length === 0 ?
                  <div className="empty-state-box mx-auto max-w-sm py-12">
                    <MdPostAdd className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />
                    <h3 className='text-lg font-medium text-text-secondary dark:text-dark-text-secondary'>
                      No bulletin yet
                    </h3>
                    <p className="text-sm text-text-secondary/60 dark:text-dark-text-secondary/60 mt-2">Publish your first post to get started</p>
                  </div>
                  :
                  PortalBulletinList.map((bulletin) => (
                    <ListBulletin key={bulletin.hash} bulletin={bulletin} />
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