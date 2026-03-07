import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'

const AvatarName = ({ address, style, short_flag = false }) => {
  const [nickname, setNickname] = useState(address)
  const { Address, ContactMap } = useSelector(state => state.User)

  useEffect(() => {
    if (address === Address) {
      setNickname('Me')
    } else if (ContactMap[address]) {
      setNickname(ContactMap[address])
    } else {
      if (short_flag) {
        setNickname(address.slice(0, 4) + '...' + address.slice(address.length - 3))
      } else {
        setNickname(address)
      }
    }
  }, [ContactMap])

  return (
    <div>
      <span className={`avatar-name ${style}`} title={address}>
        {nickname}
      </span>
    </div>
  )
}

export default AvatarName