import { memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setSearchTagList, setTagBulletinList } from '../../store/slices/MessengerSlice'
import { RequestTagBulletin } from '../../store/sagas/messenger.actions'
import { HiHashtag } from 'react-icons/hi2'

const SearchTagItem = ({ tag }) => {

  const dispatch = useDispatch()

  const { SearchTagList } = useSelector(state => state.Messenger)

  const delTag = async () => {
    let tmp = [...SearchTagList]
    tmp = tmp.filter(t => t !== tag)
    dispatch(setSearchTagList(tmp))
    if (tmp.length > 0) {
      dispatch(RequestTagBulletin({ tag: tmp, page: 1 }))
    } else {
      dispatch(setTagBulletinList({ List: [], Page: 1, TotalPage: 1 }))
    }
  }

  return (
    <div className='flex flex-row'>
      <div className='flex flex-row justify-start bulletin-link' title={tag}>
        <HiHashtag className="icon-sm" />{tag}
      </div>
      <button className='quote-del' onClick={() => delTag()} aria-label={`Remove tag ${tag}`}>
        X
      </button>
    </div>
  )
}

export default memo(SearchTagItem)