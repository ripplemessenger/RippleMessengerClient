import { useCallback } from 'react'
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
import BulletinListPage from '../components/Bulletin/BulletinListPage'
import { selectPortalBulletins, selectPublishFlags } from '../selectors'
import { setPasteFlag, setPublishFlag, setSearchTagList } from '../store/slices/MessengerSlice'

export default function PortalPage() {
  const { list: PortalBulletinList, totalPage: PortalBulletinTotalPage, page: PortalBulletinPage } = useSelector(selectPortalBulletins)
  const { showPublish: ShowPublishFlag, showForward: ShowForwardFlag, showPaste: ShowPasteFlag } = useSelector(selectPublishFlags)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleShowPublish = useCallback(() => dispatch(setPublishFlag(true)), [dispatch])
  const handleShowPaste = useCallback(() => dispatch(setPasteFlag(true)), [dispatch])

  const goto_tag = () => {
    dispatch(setSearchTagList([]))
    navigate('/bulletin_tag')
  }

  return (
    <div className="bulletin-page-wrapper">
      {ShowPublishFlag && <BulletinPublish />}
      {ShowForwardFlag && <BulletinForward />}
      {ShowPasteFlag && <BulletinPaste />}
      <BulletinListPage
        title={
          <>
            Portal
            <button className="icon-action-btn" onClick={handleShowPublish} aria-label="Publish bulletin">
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
            <button className="icon-action-btn" onClick={handleShowPaste} aria-label="Paste bulletin">
              <BiSolidFileJson className="card-icon" />
            </button>
          </>
        }
        bulletins={PortalBulletinList}
        bulletinData={{ page: PortalBulletinPage, totalPage: PortalBulletinTotalPage }}
        pageListType={'LoadPortalBulletin'}
        pageListPayload={{}}
        showEmpty
        emptyIcon={<MdPostAdd className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
        emptyTitle="No bulletin yet"
        emptyDescription="Publish your first post to get started"
        renderWrapper={false}
      />
    </div>
  )
}
