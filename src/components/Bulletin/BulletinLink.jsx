import { createSearchParams, useNavigate } from 'react-router-dom'
import AvatarName from '../AvatarName'
import { AiOutlineLink } from "react-icons/ai"

const BulletinLink = ({ address, sequence, hash, sour_address, timestamp }) => {

  const navigate = useNavigate()
  const goto_bulletin = () => {
    const params = { hash: hash, address: address, sequence: sequence, sour_address: sour_address }
    navigate({
      pathname: '/bulletin_view',
      search: `?${createSearchParams(params)}`
    })
  }

  return (
    <div className='flex flex-row items-center gap-1 cursor-pointer text-text-secondary dark:text-dark-text-secondary rounded-md border border-primary/30 dark:border-primary/40 px-2 py-0.5 min-w-0 overflow-hidden break-all hover:bg-primary/10 dark:hover:bg-primary/20 hover:border-primary/60 dark:hover:border-primary/50 hover:text-text-primary dark:hover:text-dark-text-primary transition-colors' title={hash} onClick={() => { goto_bulletin() }} key={hash}>
      <AiOutlineLink className="icon-sm" />
      <AvatarName address={address} short_flag={true} />#{sequence}
    </div>
  )
}

export default BulletinLink