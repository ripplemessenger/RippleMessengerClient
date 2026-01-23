import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FaHashtag } from "react-icons/fa"
import { BulletinPageTab } from '../../lib/AppConst'
import { setActiveTabBulletin, setSearchTagList } from '../../store/slices/MessengerSlice'

const TagLink = ({ tag }) => {

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const goto_tag = (tag) => {
    dispatch(setSearchTagList([tag]))
    navigate({
      pathname: '/bulletin',
    })
    dispatch(setActiveTabBulletin(BulletinPageTab.Tag))
  }

  return (
    <div className='flex flex-row justify-start bulletin-link' title={tag}
      onClick={() => { goto_tag(tag) }}>
      <FaHashtag className="icon-sm" />{tag}
    </div>
  )
}

export default TagLink