import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import TextTimestamp from '../TextTimestamp'
import { setDisplayJson } from '../../store/slices/UserSlice'
import AvatarImage from '../AvatarImage'
import AvatarName from '../AvatarName'

const ChannelBulletin = ({ bulletin }) => {

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { Address } = useSelector(state => state.User)

  return (
    <div>
      <div className={`flex ${bulletin.address !== Address ? 'mr-auto flex-row' : 'ml-auto flex-row-reverse'}`}>
        <div className={`flex flex-col ${bulletin.address !== Address ? 'items-start' : 'items-end'}`}>
          <AvatarImage address={bulletin.address} timestamp={Date.now()} style={'avatar-sm'} />
          <AvatarName address={bulletin.address} />
          <div className={`flex flex-row justify-between`}>
            <div className={`rounded-full px-1 border border-gray-400 shrink-0`} onClick={() => { dispatch(setDisplayJson({ json: bulletin.json, isExpand: true })) }}>
              <span className={`text-xs text-gray-500 dark:text-slate-200 text-left`}>
                #{bulletin.sequence}
              </span>
            </div>
            <TextTimestamp timestamp={bulletin.signed_at} textSize={'text-xs'} />
          </div>
        </div>
      </div >

      <div className={`flex ${bulletin.address !== Address ? 'mr-auto flex-row' : 'ml-auto flex-row-reverse'}`}>
        <div className={`${bulletin.address !== Address ? 'mr-auto' : 'ml-auto'}`}>
          <span className={`w-full text-base text-slate-800 dark:text-slate-200`} >
            {bulletin.content}
          </span>
        </div>
      </div >
    </div>
  )
}

export default ChannelBulletin