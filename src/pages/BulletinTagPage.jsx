import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import ListBulletin from '../components/Bulletin/ListBulletin'
import { trimEndCommasAndValidate } from '../lib/MessengerUtil'
import { setSearchTagList } from '../store/slices/MessengerSlice'
import SearchTagItem from '../components/Bulletin/SearchTagItem'
import PageList from '../components/PageList'
import { HiHashtag } from 'react-icons/hi2'

export default function BulletinTagPage() {
  const [tag, setTag] = useState('')

  const { Address } = useSelector(state => state.User)
  const { MessengerConnStatus, TagBulletinList, TagBulletinPage, TagBulletinTotalPage, SearchTagList } = useSelector(state => state.Messenger)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    if (Address !== null) {
      if (SearchTagList.length > 0) {
        dispatch({ type: 'RequestTagBulletin', payload: { tag: SearchTagList, page: 1 } })
      }
    }
  }, [dispatch, Address, MessengerConnStatus])

  const checkTag = async (tag) => {
    let result = trimEndCommasAndValidate(tag)
    if (result) {
      let tmp = [...SearchTagList]
      tmp.push(result)
      tmp = [...new Set(tmp)]
      dispatch(setSearchTagList(tmp))
      if (tmp.length > 0) {
        dispatch({ type: 'RequestTagBulletin', payload: { tag: tmp, page: 1 } })
      }
      setTag('')
    } else {
      setTag(tag)
    }
  }

  return (
    <div className="flex justify-center items-center w-full max-w-full overflow-hidden">
      <div className="tab-page">
        <div className="mx-auto w-full max-w-full min-w-0 flex flex-col mt-4">
          <div className="card-title">
            Tag
            <input type={"text"}
              placeholder={','}
              value={tag}
              onChange={(e) => checkTag(e.target.value)}
              className={`w-32 p-2 border rounded shadow-xl appearance-none  input-color`}
            />
          </div>

          {
            SearchTagList.length > 0 &&
            <div className='flex flex-wrap'>
              {
                SearchTagList.map((tag, index) => (
                  <div key={tag} className='mt-1 px-1'>
                    <SearchTagItem tag={tag} />
                  </div>
                ))
              }
            </div>
          }
          <div className="max-w-full min-w-0 p-4 rounded-xl card">
            {TagBulletinTotalPage > 1 && (
              <PageList current_page={TagBulletinPage} total_page={TagBulletinTotalPage} dispatch_type={'RequestTagBulletin'} payload={{ tag: SearchTagList }} />
            )}
            <div className={`mt-2 flex-1 justify-center min-w-0 overflow-hidden`}>
              {TagBulletinList.length === 0 ? (
                <div className="empty-state-box mx-auto max-w-sm py-12">
                  <HiHashtag className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />
                  <h3 className='text-lg font-medium text-text-secondary dark:text-dark-text-secondary'>No tagged bulletins</h3>
                  <p className="text-sm text-text-secondary/60 dark:text-dark-text-secondary/60 mt-2">Bulletin tags will appear here</p>
                </div>
              ) : (
                TagBulletinList.map((bulletin) => (
                  <ListBulletin key={bulletin.hash} bulletin={bulletin} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}