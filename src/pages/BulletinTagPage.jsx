import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { HiHashtag } from 'react-icons/hi2'

import TextInput from '../components/Form/TextInput'
import BulletinListPage from '../components/Bulletin/BulletinListPage'
import SearchTagItem from '../components/Bulletin/SearchTagItem'
import { selectUserAddress } from '../selectors'
import { setSearchTagList } from '../store/slices/MessengerSlice'
import { RequestTagBulletin } from '../store/sagas/messenger.actions'

export default function BulletinTagPage() {
  const { t } = useTranslation()
  const [tag, setTag] = useState('')

  const Address = useSelector(selectUserAddress)
  const { MessengerConnStatus, TagBulletinList, TagBulletinPage, TagBulletinTotalPage, SearchTagList } = useSelector(
    (state) => state.Messenger
  )

  const dispatch = useDispatch()

  useEffect(() => {
    if (Address !== null) {
      if (SearchTagList.length > 0) {
        dispatch(RequestTagBulletin({ tag: SearchTagList, page: 1 }))
      }
    }
  }, [dispatch, Address, MessengerConnStatus, SearchTagList])

  const addTag = (text) => {
    const tag_list = text
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== '')
    if (tag_list.length > 0) {
      let tmp = [...SearchTagList, ...tag_list]
      tmp = [...new Set(tmp)]
      dispatch(setSearchTagList(tmp))
      dispatch(RequestTagBulletin({ tag: tmp, page: 1 }))
      setTag('')
    }
  }

  const checkTag = (tag) => {
    if (tag.endsWith(',')) {
      addTag(tag)
    } else {
      setTag(tag)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(tag)
    }
  }

  return (
    <BulletinListPage
      title={
        <TextInput
          label=""
          placeholder={t('ui.tag_search_placeholder')}
          value={tag}
          onChange={(e) => checkTag(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      }
      extraContent={
        SearchTagList.length > 0 && (
          <div className="flex flex-wrap">
            {SearchTagList.map((tag) => (
              <div key={tag} className="mt-1 px-1">
                <SearchTagItem tag={tag} />
              </div>
            ))}
          </div>
        )
      }
      bulletins={TagBulletinList}
      bulletinData={{ page: TagBulletinPage, totalPage: TagBulletinTotalPage }}
      pageListType={'RequestTagBulletin'}
      pageListPayload={{ tag: SearchTagList }}
      wrapperStyle={'card'}
      showEmpty
      emptyIcon={<HiHashtag className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
      emptyTitle={t('page.no_tagged_bulletins')}
      emptyDescription={t('page.tags_will_appear')}
    />
  )
}
