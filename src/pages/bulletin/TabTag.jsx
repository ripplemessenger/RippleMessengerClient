import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import ListBulletin from '../../components/Bulletin/ListBulletin'
import { BulletinPageTab } from '../../lib/AppConst'
import { trimEndCommasAndValidate } from '../../lib/MessengerUtil'
import { setSearchTagList } from '../../store/slices/MessengerSlice'
import SearchTagItem from '../../components/Bulletin/SearchTagItem'
import PageList from '../../components/PageList'

export default function TabTag() {
  const [tag, setTag] = useState('')

  const { Address } = useSelector(state => state.User)
  const { MessengerConnStatus, TagBulletinList, TagBulletinPage, TagBulletinTotalPage, SearchTagList, activeTabBulletin } = useSelector(state => state.Messenger)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    if (Address !== undefined && Address !== null && activeTabBulletin === BulletinPageTab.Tag) {
      if (SearchTagList.length > 0) {
        dispatch({ type: 'RequestTagBulletin', payload: { tag: SearchTagList, page: 1 } })
      }
    }
  }, [dispatch, Address, activeTabBulletin, MessengerConnStatus])

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
    <div className="flex justify-center items-center">
      <div className="tab-page">
        <div className="mx-auto w-full flex flex-col mt-4">
          <div className="card-title">
            {BulletinPageTab.Tag}
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

          {
            TagBulletinTotalPage > 1 &&
            <PageList current_page={TagBulletinPage} total_page={TagBulletinTotalPage} dispatch_type={'RequestTagBulletin'} payload={{ tag: SearchTagList }} />
          }
          <div className={`mt-1 flex-1 justify-center`}>
            {
              TagBulletinList.length === 0 ?
                <div className="mx-auto rounded-full p-1 border-2 border-gray-200 dark:border-gray-700 px-4">
                  <h3 className='text-2xl text-gray-500 dark:text-gray-200'>
                    no bulletin yet...
                  </h3>
                </div>
                :
                TagBulletinList.map((bulletin, index) => (
                  <div key={bulletin.Hash} className='text-xs text-gray-200 mt-1 p-1'>
                    <ListBulletin bulletin={bulletin} />
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}