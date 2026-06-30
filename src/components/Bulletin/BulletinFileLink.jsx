import { useDispatch } from 'react-redux'
import { filesize_format } from '../../lib/AppUtil'
import { SaveBulletinFile } from '../../store/sagas/messenger.actions'
import { IoAttachSharp } from "react-icons/io5"

const BulletinFileLink = ({ name, ext, size, hash }) => {

  const dispatch = useDispatch()

  return (
    <button className='flex flex-row justify-start file-link' title={filesize_format(size)} onClick={() => dispatch(SaveBulletinFile({ hash, size, name, ext }))} aria-label={`Download ${name}${ext}`}>
      <IoAttachSharp className="icon-sm" />
      {name}{ext}
    </button>
  )
}

export default BulletinFileLink