import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HiHashtag } from 'react-icons/hi2'
import { IoChevronDownOutline, IoChevronForwardOutline, IoGridOutline, IoPersonOutline, IoStar } from 'react-icons/io5'
import { MdPostAdd } from 'react-icons/md'
import { SlUserFollowing } from 'react-icons/sl'

import BulletinForward from '../components/Bulletin/BulletinForward'
import BulletinPublish from '../components/Bulletin/BulletinPublish'
import BulletinListPage from '../components/Bulletin/BulletinListPage'
import SearchTagItem from '../components/Bulletin/SearchTagItem'
import TextInput from '../components/Form/TextInput'
import {
  selectPortalBulletins,
  selectFollowBulletins,
  selectBookmarkBulletins,
  selectAddressBulletins,
  selectPublishFlags,
  selectBulletinManagementData,
  selectUserAddress,
  selectMessengerConnStatus,
  selectAllTagsList,
  selectCooccurringTagsList,
  selectAllBulletinAddressesList,
  selectTagBulletins
} from '../selectors'
import { setPublishFlag, setSearchTagList } from '../store/slices/MessengerSlice'
import {
  LoadPortalBulletin,
  LoadFollowBulletin,
  LoadBookmarkBulletin,
  LoadAddressBulletin,
  SearchBulletinManagementList,
  LoadAllTags,
  FetchCooccurringTags,
  LoadAllBulletinAddresses,
  RequestTagBulletin
} from '../store/sagas/messenger.actions'

// Local bulletin filter options (first icon position)
const localFilterOptions = [
  { value: 'all', label: 'setting.filter_all', Icon: IoGridOutline },
  { value: 'followed', label: 'setting.filter_followed', Icon: SlUserFollowing },
  { value: 'bookmarked', label: 'setting.filter_bookmarked', Icon: IoStar },
  { value: 'mine', label: 'setting.filter_mine', Icon: IoPersonOutline }
]

export default function BulletinPage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()

  const userAddress = useSelector(selectUserAddress)
  const MessengerConnStatus = useSelector(selectMessengerConnStatus)

  const portal = useSelector(selectPortalBulletins)
  const follow = useSelector(selectFollowBulletins)
  const bookmark = useSelector(selectBookmarkBulletins)
  const address = useSelector(selectAddressBulletins)
  const { showPublish: ShowPublishFlag, showForward: ShowForwardFlag } = useSelector(selectPublishFlags)
  const { list: SearchList, page: SearchPage, totalPage: SearchTotalPage } = useSelector(selectBulletinManagementData)
  const allTags = useSelector(selectAllTagsList)
  const cooccurringTags = useSelector(selectCooccurringTagsList)
  const allAddresses = useSelector(selectAllBulletinAddressesList)
  const tagBulletins = useSelector(selectTagBulletins)

  const [searchParams, setSearchParams] = useSearchParams()

  // Local bulletin filter (first icon position)
  const [localFilter, setLocalFilter] = useState('all')

  // Tag search (hashtag icon position) — in-page expansion, no navigation
  const [tagSearchOpen, setTagSearchOpen] = useState(() => Boolean(searchParams.get('tag')))
  const [tagInput, setTagInput] = useState('')

  // Open the tag search panel when arriving with a ?tag= param (from TagLink), then clear the param
  useEffect(() => {
    if (searchParams.get('tag')) {
      setTagSearchOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  // Composite search state (second icon position)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchAddress, setSearchAddress] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTags, setSearchTags] = useState([])
  const [searchAttachment, setSearchAttachment] = useState('any')
  const [showTags, setShowTags] = useState(false)

  // Load tag + address options for the composite search panel
  useEffect(() => {
    dispatch(LoadAllTags())
    dispatch(LoadAllBulletinAddresses())
  }, [dispatch])

  // Load the appropriate bulletin list when the local filter changes
  useEffect(() => {
    if (!MessengerConnStatus) return
    switch (localFilter) {
      case 'followed':
        dispatch(LoadFollowBulletin({ page: 1 }))
        break
      case 'bookmarked':
        dispatch(LoadBookmarkBulletin({ page: 1 }))
        break
      case 'mine':
        if (userAddress) dispatch(LoadAddressBulletin({ address: userAddress, page: 1 }))
        break
      case 'all':
      default:
        dispatch(LoadPortalBulletin({ page: 1 }))
        break
    }
  }, [localFilter, MessengerConnStatus, userAddress, dispatch])

  const handleShowPublish = useCallback(() => dispatch(setPublishFlag(true)), [dispatch])

  // ---- Tag search handlers (ported from BulletinTagPage) ----
  const addTag = (text) => {
    const tag_list = text
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== '')
    if (tag_list.length > 0) {
      let tmp = [...tagBulletins.searchTags, ...tag_list]
      tmp = [...new Set(tmp)]
      dispatch(setSearchTagList(tmp))
      dispatch(RequestTagBulletin({ tag: tmp, page: 1 }))
      setTagInput('')
    }
  }

  const checkTag = (tag) => {
    if (tag.endsWith(',')) {
      addTag(tag)
    } else {
      setTagInput(tag)
    }
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(tagInput)
    }
  }

  // Re-run the tag search when the panel opens with existing tags
  useEffect(() => {
    if (tagSearchOpen && tagBulletins.searchTags.length > 0) {
      dispatch(RequestTagBulletin({ tag: tagBulletins.searchTags, page: 1 }))
    }
  }, [tagSearchOpen, tagBulletins.searchTags, dispatch])

  // ---- Composite search handlers ----
  const toggleTag = (tag) => {
    setSearchTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  // Auto-update the list whenever any search option changes (debounced)
  const searchTimer = useRef(null)
  useEffect(() => {
    if (!searchOpen) return
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      dispatch(
        SearchBulletinManagementList({
          query: searchQuery.trim(),
          filter: 'all',
          addressFilter: searchAddress.trim(),
          tags: searchTags,
          hasAttachment: searchAttachment,
          page: 1
        })
      )
    }, 300)
    return () => clearTimeout(searchTimer.current)
  }, [searchOpen, searchQuery, searchAddress, searchTags, searchAttachment, dispatch])

  // Fetch co-occurring tags when selected tags change
  useEffect(() => {
    if (searchTags.length === 0) return
    dispatch(FetchCooccurringTags({ selectedTags: searchTags }))
  }, [searchTags, dispatch])

  const resetSearch = () => {
    setSearchAddress('')
    setSearchQuery('')
    setSearchTags([])
    setSearchAttachment('any')
  }

  const isSearching = searchOpen
  const isTagSearching = tagSearchOpen

  // Resolve the active local-filter data source
  const filterData = {
    all: {
      list: portal.list,
      page: portal.page,
      totalPage: portal.totalPage,
      type: 'LoadPortalBulletin',
      payload: {}
    },
    followed: {
      list: follow.list,
      page: follow.page,
      totalPage: follow.totalPage,
      type: 'LoadFollowBulletin',
      payload: {}
    },
    bookmarked: {
      list: bookmark.list,
      page: bookmark.page,
      totalPage: bookmark.totalPage,
      type: 'LoadBookmarkBulletin',
      payload: {}
    },
    mine: {
      list: address.list,
      page: address.page,
      totalPage: address.totalPage,
      type: 'LoadAddressBulletin',
      payload: { address: userAddress }
    }
  }[localFilter]

  const currentFilter = localFilterOptions.find((o) => o.value === localFilter) || localFilterOptions[0]
  const CurrentIcon = currentFilter.Icon

  const searchPanel = (
    <div className="mb-3 space-y-3 p-3 rounded-lg border border-primary/20 dark:border-primary/30 bg-surface/50 dark:bg-dark-surface/50">
      {/* Row 1: address + content + attachment + tags toggle + reset */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Address */}
        <select
          value={searchAddress}
          onChange={(e) => setSearchAddress(e.target.value)}
          title={t('search.address')}
          className="px-2.5 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-900 border-primary/20 dark:border-primary/30 text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
        >
          <option value="">{t('search.address_all')}</option>
          {allAddresses.map((a) => (
            <option key={a.address} value={a.address}>
              {a.nickname ? `${a.nickname} (${a.address})` : a.address}
            </option>
          ))}
        </select>
        {/* Content */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('search.content_placeholder')}
          title={t('search.content')}
          className="w-40 px-2.5 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-900 border-primary/20 dark:border-primary/30 text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        {/* Attachment (checkbox) */}
        <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
          <input
            type="checkbox"
            checked={searchAttachment === 'with'}
            onChange={(e) => setSearchAttachment(e.target.checked ? 'with' : 'any')}
            className="w-4 h-4 rounded accent-primary cursor-pointer"
          />
          <span className="text-sm text-text-primary dark:text-dark-text-primary">{t('search.attachment_with')}</span>
        </label>
        {/* Tags toggle */}
        <button
          className="btn-sm btn-primary-outline flex items-center gap-1 shrink-0"
          onClick={() => setShowTags((v) => !v)}
        >
          {t('search.tags')}
          {showTags ? <IoChevronDownOutline className="w-4 h-4" /> : <IoChevronForwardOutline className="w-4 h-4" />}
        </button>
        {/* Reset */}
        <button className="btn-sm btn-primary-outline ml-auto shrink-0" onClick={resetSearch}>
          {t('search.reset')}
        </button>
      </div>
      {/* Row 2: tags (collapsible) */}
      {showTags && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm shrink-0 text-text-primary dark:text-dark-text-primary">{t('search.tags')}</label>
          <div className="flex flex-wrap gap-1.5">
            {(() => {
              const displayTags = searchTags.length > 0 ? cooccurringTags : allTags
              if (displayTags.length === 0) {
                return (
                  <span className="text-sm text-text-secondary/60 dark:text-dark-text-secondary/60">
                    {t('search.tags_none')}
                  </span>
                )
              }
              return displayTags.map((tag) => {
                const active = searchTags.includes(tag)
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      active
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white dark:bg-gray-900 border-primary/30 dark:border-primary/40 text-text-primary dark:text-dark-text-primary hover:bg-primary/10'
                    }`}
                  >
                    {tag}
                  </button>
                )
              })
            })()}
          </div>
        </div>
      )}
    </div>
  )

  // Tag search panel (in-page, like the composite search panel)
  const tagSearchPanel = (
    <div className="mb-3 space-y-3 max-w-md mx-auto">
      <TextInput
        label=""
        placeholder={t('ui.tag_search_placeholder')}
        value={tagInput}
        onChange={(e) => checkTag(e.target.value)}
        onKeyDown={handleTagKeyDown}
        autoComplete="off"
      />
      {tagBulletins.searchTags.length > 0 && (
        <div className="flex flex-wrap">
          {tagBulletins.searchTags.map((tag) => (
            <div key={tag} className="mt-1 px-1">
              <SearchTagItem tag={tag} />
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Title-bar icon row (shared by list mode and random-feed mode)
  const titleIcons = (
    <>
      {/* First icon position: local bulletin filter switcher */}
      <div className="relative group/filter">
        <button className="icon-action-btn" aria-label={t(currentFilter.label)} title={t(currentFilter.label)}>
          <CurrentIcon className="card-icon" />
        </button>
        <div className="absolute left-0 top-full mt-1 min-w-[170px] bg-surface dark:bg-dark-surface border border-primary/20 dark:border-primary/30 rounded-lg shadow-lg overflow-hidden z-50 opacity-0 invisible group-hover/filter:opacity-100 group-hover/filter:visible transition-opacity">
          {localFilterOptions.map((opt) => {
            const OptIcon = opt.Icon
            const active = localFilter === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => {
                  setLocalFilter(opt.value)
                  setTagSearchOpen(false)
                }}
                className={`flex items-center gap-2 px-3 py-2 text-sm w-full text-left transition-colors ${
                  active
                    ? 'text-primary dark:text-dark-primary font-medium bg-primary/10 dark:bg-dark-primary/10'
                    : 'text-text-primary dark:text-dark-text-primary hover:bg-primary/10 dark:hover:bg-dark-primary/10'
                }`}
              >
                <OptIcon className="w-4 h-4" />
                {t(opt.label)}
              </button>
            )
          })}
        </div>
      </div>
      {/* Second icon position: composite search (expands in-page) */}
      <button
        className={`icon-action-btn ${searchOpen ? 'text-primary dark:text-dark-primary' : ''}`}
        onClick={() => {
          setSearchOpen(!searchOpen)
          setTagSearchOpen(false)
        }}
        aria-label={t('ui.search_bulletin')}
        title={t('ui.search_bulletin')}
      >
        <svg className="card-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
      {/* Third icon position: online tag search (expands in-page) */}
      <button
        className={`icon-action-btn ${tagSearchOpen ? 'text-primary dark:text-dark-primary' : ''}`}
        onClick={() => {
          setTagSearchOpen(!tagSearchOpen)
          setSearchOpen(false)
        }}
        aria-label={t('common.search_tags')}
        title={t('common.search_tags')}
      >
        <HiHashtag className="card-icon" />
      </button>
    </>
  )

  // Resolve the active list source (tag search > composite search > local filter)
  let listProps
  if (isTagSearching) {
    listProps = {
      extraContent: tagSearchPanel,
      bulletins: tagBulletins.list,
      bulletinData: { page: tagBulletins.page, totalPage: tagBulletins.totalPage },
      pageListType: 'RequestTagBulletin',
      pageListPayload: { tag: tagBulletins.searchTags },
      showEmpty: tagBulletins.searchTags.length > 0,
      emptyIcon: <HiHashtag className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />,
      emptyTitle: t('page.no_tagged_bulletins'),
      emptyDescription: ''
    }
  } else if (isSearching) {
    listProps = {
      extraContent: searchPanel,
      bulletins: SearchList,
      bulletinData: { page: SearchPage, totalPage: SearchTotalPage },
      pageListType: 'SearchBulletinManagementList',
      pageListPayload: {
        query: searchQuery.trim(),
        filter: 'all',
        addressFilter: searchAddress.trim(),
        tags: searchTags,
        hasAttachment: searchAttachment
      },
      emptyIcon: <CurrentIcon className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />,
      emptyTitle: t('ui.no_results'),
      emptyDescription: '',
      showEmpty: true
    }
  } else {
    listProps = {
      extraContent: null,
      bulletins: filterData.list,
      bulletinData: { page: filterData.page, totalPage: filterData.totalPage },
      pageListType: filterData.type,
      pageListPayload: filterData.payload,
      showEmpty: true,
      emptyIcon: <CurrentIcon className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />,
      emptyTitle: t('ui.no_bulletin_yet'),
      emptyDescription: t('ui.publish_first_post')
    }
  }

  return (
    <div className="page-wrapper">
      {ShowPublishFlag && <BulletinPublish />}
      {ShowForwardFlag && <BulletinForward />}
      <BulletinListPage
        title={
          <>
            {t('page.bulletin')}
            {titleIcons}
          </>
        }
        extraContent={listProps.extraContent}
        bulletins={listProps.bulletins}
        bulletinData={listProps.bulletinData}
        pageListType={listProps.pageListType}
        pageListPayload={listProps.pageListPayload}
        showEmpty={listProps.showEmpty}
        emptyIcon={listProps.emptyIcon}
        emptyTitle={listProps.emptyTitle}
        emptyDescription={listProps.emptyDescription}
        renderWrapper={false}
      />
      {/* Floating Action Button — publish */}
      <button
        onClick={handleShowPublish}
        aria-label={t('common.publish_bulletin')}
        title={t('common.publish_bulletin')}
        className="fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <MdPostAdd className="w-7 h-7" />
      </button>
    </div>
  )
}
