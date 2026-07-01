import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { BiSolidFileJson } from 'react-icons/bi'
import { GiPerspectiveDiceSixFacesRandom } from 'react-icons/gi'
import { HiHashtag } from 'react-icons/hi2'
import { IoStar } from 'react-icons/io5'
import { MdPostAdd } from 'react-icons/md'
import { SlUserFollowing } from 'react-icons/sl'

import BulletinForward from '../components/Bulletin/BulletinForward'
import BulletinPaste from '../components/Bulletin/BulletinPaste'
import BulletinPublish from '../components/Bulletin/BulletinPublish'
import ListBulletin from '../components/Bulletin/ListBulletin'
import EmptyState from '../components/EmptyState'
import PageList from '../components/PageList'
import { selectPortalBulletins, selectPublishFlags } from '../selectors'
import { setPasteFlag, setPublishFlag, setSearchTagList } from '../store/slices/MessengerSlice'

export default function PortalPage() {
  const { list: PortalBulletinList, totalPage: PortalBulletinTotalPage, page: PortalBulletinPage } = useSelector(selectPortalBulletins)
  const { showPublish: ShowPublishFlag, showForward: ShowForwardFlag, showPaste: ShowPasteFlag } = useSelector(selectPublishFlags)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const goto_tag = () => {
    dispatch(setSearchTagList([]))
    navigate('/bulletin_tag')
  }

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
      {
        ShowPasteFlag &&
        <BulletinPaste />
      }
      <div className="tab-page">
        <div className="bulletin-page-inner">
          <div className="card-title flex flex-row items-center">
            Portal
            <button className="icon-action-btn" onClick={() => dispatch(setPublishFlag(true))} aria-label="Publish bulletin">
              <MdPostAdd className="card-icon" />
            </button>
            <button className="icon-action-btn" onClick={() => navigate('/bulletin_follow')} aria-label="Followed bulletins">
              <SlUserFollowing className="card-icon" />
            </button>
            <button className="icon-action-btn" onClick={() => goto_tag()} aria-label="Search tags">
              <HiHashtag className="card-icon" />
            </button>
            <button className="icon-action-btn" onClick={() => navigate('/bulletin_bookmark')} aria-label="Bookmarks">
              <IoStar className="card-icon" />
            </button>
            <button className="icon-action-btn" onClick={() => navigate('/bulletin_random')} aria-label="Random bulletin">
              <GiPerspectiveDiceSixFacesRandom className="card-icon" />
            </button>
            <button className="icon-action-btn" onClick={() => dispatch(setPasteFlag(true))} aria-label="Paste bulletin">
              <BiSolidFileJson className="card-icon" />
            </button>
          </div>

          <div className="bulletin-card-list">
            <div className={`bulletin-list-content`}>
              {
                PortalBulletinList.length === 0 ?
                  <EmptyState
                    icon={<MdPostAdd className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
                    title="No bulletin yet"
                    description="Publish your first post to get started"
                  />
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