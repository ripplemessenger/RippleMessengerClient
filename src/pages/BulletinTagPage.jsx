import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { HiHashtag } from 'react-icons/hi2'

import EmptyState from '../components/EmptyState'
import ListBulletin from '../components/Bulletin/ListBulletin'
import PageList from '../components/PageList'
import SearchTagItem from '../components/Bulletin/SearchTagItem'
import { useUserAddress } from '../hooks/useUserSelectors'
import { trimEndCommasAndValidate } from '../lib/MessengerUtil'
import { setSearchTagList } from '../store/slices/MessengerSlice'

export default function BulletinTagPage() {
  const [tag, setTag] = useState('')

  const Address = useUserAddress()
  const { MessengerConnStatus, TagBulletinList, TagBulletinPage, TagBulletinTotalPage, SearchTagList } = useSelector(state => state.Messenger)

  const dispatch = useDispatch()

  useEffect(() => {
    if (Address !== null) {
      if (SearchTagList.length > 0) {
        dispatch({ type: 'RequestTagBulletin', payload: { tag: SearchTagList, page: 1 } })
      }
    }
  }, [dispatch, Address, MessengerConnStatus])

  const checkTag = async (tag) => {
    const result = trimEndCommasAndValidate(tag)
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
    <div className="bulletin-page-wrapper">
      <div className="tab-page">
        <div className="bulletin-page-inner">
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
            <div className={`bulletin-list-content`}>
              {TagBulletinList.length === 0 ? (
                <EmptyState
                  icon={<HiHashtag className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
                  title="No tagged bulletins"
                  description="Bulletin tags will appear here"
                />
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