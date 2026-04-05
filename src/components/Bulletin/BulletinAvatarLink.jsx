import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import AvatarImage from '../AvatarImage'
import { setBulletinAddress } from '../../store/slices/MessengerSlice'

const BulletinAvatarLink = ({ address, timestamp, style }) => {

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const goto_address = (address) => {
    dispatch(setBulletinAddress(address))
    navigate('/bulletin_address')
  }

  return (
    <AvatarImage address={address} timestamp={timestamp} style={style} onClick={() => goto_address(address)} />
  )
}

export default BulletinAvatarLink