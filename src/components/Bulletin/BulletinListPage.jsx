import ListBulletin from './ListBulletin'
import EmptyState from '../EmptyState'
import PageList from '../PageList'

/**
 * Shared bulletin list renderer extracted from PortalPage, BulletinFollowPage,
 * BulletinBookmarkPage, BulletinRandomPage, BulletinTagPage, BulletinAddressPage.
 *
 * Renders the inner shell (tab-page > bulletin-page-inner) shared by all these pages.
 * Pages that need modals (Publish/Forward/Paste) should wrap this component in
 * `bulletin-page-wrapper` and render modals before <BulletinListPage />.
 * Pages without modals can use this component directly — it renders its own wrapper.
 *
 * @param {object} props
 * @param {React.ReactNode} props.title - Card title content (plain text or with action buttons)
 * @param {string[]} props.bulletins - Array of bulletin objects with `hash` key
 * @param {object} [props.bulletinData] - Pagination data { page, totalPage }
 * @param {string} [props.pageListType] - dispatch_type for PageList (omit for non-paginated lists)
 * @param {object} [props.pageListPayload] - payload object passed to PageList
 * @param {boolean} [props.showEmpty] - Whether to render EmptyState when list is empty (default: true)
 * @param {React.ReactNode} [props.emptyIcon] - Icon for EmptyState
 * @param {string} [props.emptyTitle] - Title text for EmptyState
 * @param {string} [props.emptyDescription] - Description text for EmptyState
 * @param {'before'|'after'} [props.pageListPosition] - 'before': PageList above content (default), 'after': below content
 * @param {'card'|'list'} [props.wrapperStyle] - 'list': bulletin-card-list div, 'card': max-w-full card div
 * @param {React.ReactNode} [props.extraContent] - Optional content between title and list (e.g. tag chips)
 * @param {boolean} [props.renderWrapper] - Whether to render bulletin-page-wrapper div (default: true). Set false when page wraps itself.
 */
export default function BulletinListPage({
  title,
  bulletins,
  bulletinData,
  pageListType,
  pageListPayload = {},
  showEmpty = true,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  pageListPosition = 'before',
  wrapperStyle = 'list',
  extraContent,
  renderWrapper = true,
}) {
  const hasBulletins = bulletins.length > 0
  const shouldShowPagination = bulletinData && pageListType && bulletinData.totalPage > 1

  const pageListElement = shouldShowPagination ? (
    <PageList
      current_page={bulletinData.page}
      total_page={bulletinData.totalPage}
      dispatch_type={pageListType}
      payload={pageListPayload}
    />
  ) : null

  const listContent = (
    <div className="bulletin-list-content">
      {(!hasBulletins && showEmpty) ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        bulletins.map((bulletin) => (
          <ListBulletin key={bulletin.hash} bulletin={bulletin} />
        ))
      )}
    </div>
  )

  const innerContent = wrapperStyle === 'card' ? (
    <div className="max-w-full min-w-0 p-4 rounded-xl card">
      {pageListPosition === 'before' && pageListElement}
      {listContent}
      {pageListPosition === 'after' && pageListElement}
    </div>
  ) : (
    <div className="bulletin-card-list">
      {pageListPosition === 'before' && pageListElement}
      {listContent}
      {pageListPosition === 'after' && pageListElement}
    </div>
  )

  const innerShell = (
    <div className="tab-page">
      <div className="bulletin-page-inner">
        <div className="card-title flex flex-row items-center">
          {title}
        </div>
        {extraContent}
        {innerContent}
      </div>
    </div>
  )

  if (renderWrapper) {
    return (
      <div className="bulletin-page-wrapper">
        {innerShell}
      </div>
    )
  }

  return innerShell
}
