import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { setSearchTagList } from '../../store/slices/MessengerSlice'
import { HiHashtag } from 'react-icons/hi2'

const TagLink = ({ tag }) => {

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const goto_tag = (tag) => {
    dispatch(setSearchTagList([tag]))
    navigate({
      pathname: '/bulletin_tag',
    })
  }

  return (
    <div className='flex flex-row justify-start bulletin-link' title={tag}
      onClick={() => { goto_tag(tag) }}>
      <HiHashtag className="icon-sm" />{tag}
    </div>
  )
}

export default TagLink