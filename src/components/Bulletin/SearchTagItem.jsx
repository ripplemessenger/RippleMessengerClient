import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { FaHashtag } from "react-icons/fa"
import { setSearchTagList, setTagBulletinList } from '../../store/slices/MessengerSlice'

const SearchTagItem = ({ tag }) => {

  const navigate = useNavigate()
  const dispatch = useDispatch()

  const { SearchTagList } = useSelector(state => state.Messenger)

  const delTag = async () => {
    let tmp = [...SearchTagList]
    tmp = tmp.filter(t => t !== tag)
    dispatch(setSearchTagList(tmp))
    if (tmp.length > 0) {
      dispatch({ type: 'RequestTagBulletin', payload: { tag: tmp, page: 1 } })
    } else {
      dispatch(setTagBulletinList({ List: [], Page: 1, TotalPage: 1 }))
    }
  }

  return (
    <div className='flex flex-row'>
      <div className='flex flex-row justify-start bulletin-link' title={tag}>
        <FaHashtag className="icon-sm" />{tag}
      </div>
      <div className='quote-del' onClick={() => delTag()}>
        X
      </div>
    </div>
  )
}

export default SearchTagItem