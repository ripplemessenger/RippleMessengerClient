import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { filesize_format } from '../../lib/AppUtil'
import { IoAttachSharp } from "react-icons/io5"

const BulletinFileLink = ({ name, ext, size, hash }) => {

  const navigate = useNavigate()
  const dispatch = useDispatch()

  return (
    <div className='flex flex-row justify-start file-link' title={filesize_format(size)} onClick={() => dispatch({ type: 'SaveBulletinFile', payload: { hash: hash, size: size, name: name, ext: ext } })}>
      <IoAttachSharp className="icon-sm" />
      {name}{ext}
    </div>
  )
}

export default BulletinFileLink