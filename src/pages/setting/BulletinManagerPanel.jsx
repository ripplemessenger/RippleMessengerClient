import { useState, useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, createSearchParams } from 'react-router-dom'
import { MdOutlineArticle } from 'react-icons/md'
import TextTimestamp from '../../components/TextTimestamp'
import EmptyState from '../../components/EmptyState'
import { selectBulletinManagementData, selectAllTagsList, selectUserAddress } from '../../selectors'
import { setBulletinAddress } from '../../store/slices/MessengerSlice'
import {
  LoadBulletinManagementList,
  DeleteBulletinItem,
  BulkDeleteBulletins,
  SearchBulletinManagementList,
  LoadBulletinManagementByTag,
  LoadAllTags,
} from '../../store/sagas/messenger.actions'

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'Mine' },
  { value: 'bookmarked', label: 'Bookmarked' },
  { value: 'followed', label: 'Followed' },
]

export default function BulletinManagerPanel() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { list, page, totalPage } = useSelector(selectBulletinManagementData)
  const allTags = useSelector(selectAllTagsList)
  const userAddress = useSelector(selectUserAddress)
  const [currentFilter, setCurrentFilter] = useState('all')
  const [selectedHashes, setSelectedHashes] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const searchTimer = useRef(null)

  // Filters where every visible item is protected from deletion
  const protectedFilters = new Set(['mine', 'bookmarked', 'followed'])

  const isProtected = useCallback((item) => {
    if (protectedFilters.has(currentFilter)) return true
    if (!userAddress) return false
    return (
      item.address === userAddress ||
      item.is_marked === true ||
      item.is_followed === true
    )
  }, [currentFilter, userAddress])

  useEffect(() => {
    dispatch(LoadAllTags())
  }, [dispatch])

  const handleSearch = useCallback((q) => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      dispatch(SearchBulletinManagementList({ query: q, filter: currentFilter }))
    }, 300)
  }, [dispatch, currentFilter])

  useEffect(() => {
    setSearchQuery('')
    setSelectedTag('')
    dispatch(LoadBulletinManagementList({ filter: currentFilter, page: 1 }))
    setSelectedHashes([])
  }, [currentFilter])

  useEffect(() => {
    return () => clearTimeout(searchTimer.current)
  }, [])

  const handlePageChange = useCallback((newPage) => {
    if (newPage < 1 || newPage > totalPage) return
    dispatch(LoadBulletinManagementList({ filter: currentFilter, page: newPage }))
    setSelectedHashes([])
  }, [dispatch, currentFilter, totalPage])

  const toggleSelect = useCallback((hash) => {
    const item = list.find(i => i.hash === hash)
    if (item && isProtected(item)) return
    setSelectedHashes(prev =>
      prev.includes(hash) ? prev.filter(h => h !== hash) : [...prev, hash]
    )
  }, [list, isProtected])

  const toggleSelectAll = useCallback(() => {
    const nonProtected = list.filter(item => !isProtected(item))
    if (nonProtected.length === 0) return
    const unprotectedHashes = nonProtected.map(item => item.hash)
    const allSelected = unprotectedHashes.every(h => selectedHashes.includes(h))
    setSelectedHashes(prev =>
      allSelected ? prev.filter(h => !unprotectedHashes.includes(h)) : unprotectedHashes
    )
  }, [list, isProtected, selectedHashes])

  const handleDeleteSingle = useCallback((hash) => {
    dispatch(DeleteBulletinItem({ hash, filter: currentFilter }))
  }, [dispatch, currentFilter])

  const handleBulkDelete = useCallback(() => {
    if (selectedHashes.length === 0) return
    dispatch(BulkDeleteBulletins({ hashes: selectedHashes, filter: currentFilter }))
    setSelectedHashes([])
  }, [dispatch, selectedHashes, currentFilter])

  const gotoAddress = useCallback((address) => {
    dispatch(setBulletinAddress(address))
    navigate('/bulletin_address')
  }, [dispatch, navigate])

  const gotoBulletin = useCallback((item) => {
    navigate({
      pathname: '/bulletin_view',
      search: `?${createSearchParams({ hash: item.hash, address: item.address, sequence: item.sequence })}`
    })
  }, [navigate])

  const handleTagChange = useCallback((tagName) => {
    setSelectedTag(tagName)
    setSearchQuery('')
    if (tagName) {
      dispatch(LoadBulletinManagementByTag({ tagName, page: 1 }))
    } else {
      dispatch(LoadBulletinManagementList({ filter: currentFilter, page: 1 }))
    }
    setSelectedHashes([])
  }, [dispatch, currentFilter])

  return (
    <>
      <div className="flex flex-row items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {/* Filter dropdown */}
          <select
            value={currentFilter}
            onChange={(e) => setCurrentFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-900 border-primary/20 dark:border-primary/30 text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            {filterOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Tag filter dropdown */}
          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => handleTagChange(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-900 border-primary/20 dark:border-primary/30 text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="">All Tags</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          )}

          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                handleSearch(e.target.value)
              }}
              placeholder="Search content..."
              className="pl-8 pr-3 py-1.5 text-sm border rounded-lg bg-white dark:bg-gray-900 border-primary/20 dark:border-primary/30 text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            <svg
              className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50 dark:text-dark-text-secondary/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Bulk delete */}
          {selectedHashes.length > 0 && (
            <button
              onClick={() => handleBulkDelete()}
              className="btn-sm btn-danger"
            >
              Delete Selected ({selectedHashes.length})
            </button>
          )}
        </div>
      </div>

      {list.length > 0 ? (
        <>
          <div className={`table-container`}>
            <table className="table-fixed w-full divide-y divide-primary/10 dark:divide-primary/20">
              <thead>
                <tr className="table-header-row">
                  <th style={{width: 48}}>
                    <input
                      type="checkbox"
                      checked={selectedHashes.length === list.filter(item => !isProtected(item)).length && list.filter(item => !isProtected(item)).length > 0}
                      onChange={toggleSelectAll}
                      disabled={protectedFilters.has(currentFilter) || list.filter(item => !isProtected(item)).length === 0}
                      title={protectedFilters.has(currentFilter) ? 'These bulletins cannot be deleted' : undefined}
                      className="rounded disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </th>
                  <th style={{width: 160}}>Address</th>
                  <th style={{width: 72}}>Seq</th>
                  <th>Content</th>
                  <th style={{width: 128}}>Timestamp</th>
                  <th style={{width: 108}}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10 dark:divide-primary/20">
                {list.map((item) => {
                  const protected_ = isProtected(item)
                  return (
                  <tr key={item.hash} className={`table-tr ${selectedHashes.includes(item.hash) ? 'bg-primary/5 dark:bg-primary/10' : ''} ${protected_ ? 'opacity-60' : ''}`}>
                    <td className="table-cell">
                      <input
                        type="checkbox"
                        checked={selectedHashes.includes(item.hash)}
                        onChange={() => toggleSelect(item.hash)}
                        disabled={protected_}
                        title={protected_ ? 'Protected bulletin' : undefined}
                        className="rounded disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="table-cell text-center">
                      <span
                        className="text-xs font-mono text-primary dark:text-dark-primary cursor-pointer hover:underline"
                        title={item.address}
                        onClick={() => gotoAddress(item.address)}
                      >
                        {item.nickname || item.address.substring(0, 6) + '...' + item.address.substring(item.address.length - 4)}
                      </span>
                    </td>
                    <td className="table-cell text-center">
                      <span
                        className="text-xs font-mono text-primary dark:text-dark-primary cursor-pointer hover:underline"
                        title={item.hash}
                        onClick={() => gotoBulletin(item)}
                      >
                        {item.sequence}
                      </span>
                    </td>
                    <td className="table-cell max-w-xs">
                      <span className="text-xs text-text-secondary dark:text-dark-text-secondary block truncate" title={item.content_preview}>
                        {item.content_preview}
                      </span>
                    </td>
                    <td className="table-cell">
                      <TextTimestamp timestamp={item.signed_at} />
                    </td>
                    <td className="table-cell">
                      <button
                        className={`btn-sm ${protected_ ? 'btn-secondary opacity-40 cursor-not-allowed' : 'btn-danger'}`}
                        onClick={() => handleDeleteSingle(item.hash)}
                        disabled={protected_}
                        title={protected_ ? 'This bulletin cannot be deleted' : undefined}
                      >
                        {protected_ ? 'Protected' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-text-secondary dark:text-dark-text-secondary">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-primary/20 dark:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span>Page {page} / {totalPage}</span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPage}
              className="px-3 py-1.5 rounded-lg border border-primary/20 dark:border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <EmptyState
          icon={<MdOutlineArticle className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
          title="No bulletins found"
          description="Bulletins matching this filter will appear here"
          className="mx-auto max-w-sm mt-8"
        />
      )}
    </>
  )
}
