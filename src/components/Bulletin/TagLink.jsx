import React from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { setSearchTagList } from '../../store/slices/MessengerSlice'
import { HiHashtag } from 'react-icons/hi2'

const TagLink = ({ tag }) => {

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const goto_tag = (tag) => {
    dispatch(setSearchTagList([tag]))
    navigate({
      pathname: '/bulletin_tag',
    })
  }

  return (
    <div className='flex flex-row items-center gap-1 cursor-pointer text-text-secondary dark:text-dark-text-secondary rounded-full border border-primary/30 dark:border-primary/50 px-2 py-0.5 min-w-0 overflow-hidden break-all hover:border-primary-60 dark:hover:border-primary/70 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors' title={tag}
      onClick={() => { goto_tag(tag) }}>
      <HiHashtag className="icon-sm" />{tag}
    </div>
  )
}

export default React.memo(TagLink)