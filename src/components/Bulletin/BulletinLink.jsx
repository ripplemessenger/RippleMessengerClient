import { createSearchParams, useNavigate } from 'react-router-dom'
import AvatarName from '../AvatarName'
import { AiOutlineLink } from "react-icons/ai"

const BulletinLink = ({ address, sequence, hash, sour_address, timestamp = Date.now() }) => {

  const navigate = useNavigate()
  const goto_bulletin = () => {
    const params = { hash: hash, address: address, sequence: sequence, sour_address: sour_address };
    navigate({
      pathname: '/bulletin_view',
      search: `?${createSearchParams(params)}`
    })
  }

  return (
    <div className='flex flex-row justify-start bulletin-link' title={hash} onClick={() => { goto_bulletin() }} key={timestamp}>
      <AiOutlineLink className="icon-sm" />
      <AvatarName address={address} />#{sequence}
    </div>
  )
}

export default BulletinLink