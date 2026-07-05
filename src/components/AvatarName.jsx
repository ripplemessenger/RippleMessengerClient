import { useMemo, memo } from 'react'
import { useSelector } from 'react-redux'
import { selectAvatarNameData } from '../selectors'

const AvatarName = ({ address, classNames = '', short_flag = false }) => {
  const { Address, ContactMap } = useSelector(selectAvatarNameData)

  const { nickname, contactFlag } = useMemo(() => {
    if (address === Address) {
      return { nickname: 'Me', contactFlag: true }
    } else if (ContactMap[address]) {
      return { nickname: ContactMap[address], contactFlag: true }
    } else {
      const nickname = short_flag
        ? address.slice(0, 4) + '...' + address.slice(address.length - 3)
        : address
      return { nickname, contactFlag: false }
    }
  }, [ContactMap, address, Address, short_flag])

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
