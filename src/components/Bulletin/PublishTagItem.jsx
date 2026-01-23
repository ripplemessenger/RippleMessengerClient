import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FaHashtag } from "react-icons/fa"

const PublishTagItem = ({ tag }) => {

  const navigate = useNavigate()
  const dispatch = useDispatch()

  return (
    <div className='flex flex-row'>
      <div className='tag-link' title={tag}>
        <FaHashtag className="icon-sm" />{tag}
      </div>
      <div className='tag-del' onClick={() => dispatch({ type: 'BulletinTagDel', payload: { Tag: tag } })}>
        X
      </div>
    </div>
  )
}

export default PublishTagItem