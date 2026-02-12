import { useDispatch } from 'react-redux'
const PageList = ({ current_page, total_page, dispatch_type, payload }) => {
  const dispatch = useDispatch()
  const pages = Array.from({ length: total_page }, (_, index) => index + 1)

  const goto_page = async (page) => {
    let tmp = payload
    tmp['page'] = page
    dispatch({ type: dispatch_type, payload: tmp })
  }
  return (
    <div className='row-center-middle'>
      {pages.map((page) => (
        <div key={page.toString()} className={`${page == current_page ? 'current-page' : 'page'}`} onClick={() => goto_page(page)}>
          {page}
        </div>
      ))}
    </div>
  );
};

export default PageList
