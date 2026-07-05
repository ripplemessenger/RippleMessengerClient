import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { HiHashtag } from 'react-icons/hi2'

import TextInput from '../components/Form/TextInput'
import BulletinListPage from '../components/Bulletin/BulletinListPage'
import SearchTagItem from '../components/Bulletin/SearchTagItem'
import { selectUserAddress } from '../selectors'
import { trimEndCommasAndValidate } from '../lib/MessengerUtil'
import { setSearchTagList } from '../store/slices/MessengerSlice'
import { RequestTagBulletin } from '../store/sagas/messenger.actions'

export default function BulletinTagPage() {
  const [tag, setTag] = useState('')

  const Address = useSelector(selectUserAddress)
  const { MessengerConnStatus, TagBulletinList, TagBulletinPage, TagBulletinTotalPage, SearchTagList } = useSelector(state => state.Messenger)

  const dispatch = useDispatch()

  useEffect(() => {
    if (Address !== null) {
      if (SearchTagList.length > 0) {
        dispatch(RequestTagBulletin({ tag: SearchTagList, page: 1 }))
      }
    }
  }, [dispatch, Address, MessengerConnStatus])

  const checkTag = (tag) => {
    const result = trimEndCommasAndValidate(tag)
    if (result) {
      let tmp = [...SearchTagList]
      tmp.push(result)
      tmp = [...new Set(tmp)]
      dispatch(setSearchTagList(tmp))
      if (tmp.length > 0) {
        dispatch(RequestTagBulletin({ tag: tmp, page: 1 }))
      }
      setTag('')
    } else {
      setTag(tag)
    }
  }

  return (
    <BulletinListPage
      title={
        <TextInput
          label=""
          placeholder={','}
          value={tag}
          onChange={(e) => checkTag(e.target.value)}
          autoComplete="off"
        />
      }
      extraContent={
        SearchTagList.length > 0 &&
        <div className='flex flex-wrap'>
          {SearchTagList.map((tag) => (
            <div key={tag} className='mt-1 px-1'>
              <SearchTagItem tag={tag} />
            </div>
          ))}
        </div>
      }
      bulletins={TagBulletinList}
      bulletinData={{ page: TagBulletinPage, totalPage: TagBulletinTotalPage }}
      pageListType={'RequestTagBulletin'}
      pageListPayload={{ tag: SearchTagList }}
      wrapperStyle={'card'}
      showEmpty
      emptyIcon={<HiHashtag className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
      emptyTitle="No tagged bulletins"
      emptyDescription="Bulletin tags will appear here"
    />
  )
}
