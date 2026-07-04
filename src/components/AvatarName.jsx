import { useState, useEffect, memo } from 'react'
import { useSelector } from 'react-redux'

const AvatarName = ({ address, classNames = '', short_flag = false }) => {
  const [nickname, setNickname] = useState(address)
  const [contactFlag, setContactFlag] = useState(false)
  const { Address, ContactMap } = useSelector(state => state.User)

  useEffect(() => {
    if (address === Address) {
      setNickname('Me')
      setContactFlag(true)
    } else if (ContactMap[address]) {
      setNickname(ContactMap[address])
      setContactFlag(true)
    } else {
      if (short_flag) {
        setNickname(address.slice(0, 4) + '...' + address.slice(address.length - 3))
      } else {
        setNickname(address)
      }
    }
  }, [ContactMap, address])

  return (
    <div>
      {
        contactFlag ?
          <span className={`avatar-name ${classNames}`} title={address}>
            {nickname}
          </span>
          :
          <span className={`plain-address ${classNames}`} title={address}>
            {nickname}
          </span>
      }
    </div>
  )
}

export default memo(AvatarName)
