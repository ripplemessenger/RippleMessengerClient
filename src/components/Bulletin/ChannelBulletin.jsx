import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import TextTimestamp from '../TextTimestamp'
import { setDisplayJson } from '../../store/slices/UserSlice'
import AvatarImage from '../AvatarImage'

const ChannelBulletin = ({ bulletin }) => {

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { Address } = useSelector(state => state.User)

  return (
    <div>
      <div className={`flex ${bulletin.Address !== Address ? 'mr-auto flex-row' : 'ml-auto flex-row-reverse'}`}>
        <div className={`flex flex-col  ${bulletin.Address !== Address ? 'items-start' : 'items-end'}`}>
          <AvatarImage address={bulletin.Address} timestamp={Date.now()} style={'avatar-sm'} />
          <div className={`flex flex-row justify-between`}>
            <div className={`rounded-full px-1 border border-gray-400 shrink-0`} onClick={() => { dispatch(setDisplayJson({ json: bulletin.Json, isExpand: true })) }}>
              <span className={`text-xs text-gray-500 dark:text-slate-200 text-left`}>
                #{bulletin.Sequence}
              </span>
            </div>
            <TextTimestamp timestamp={bulletin.SignedAt} textSize={'text-xs'} />
          </div>
        </div>
      </div >

      <div className={`flex ${bulletin.Address !== Address ? 'mr-auto flex-row' : 'ml-auto flex-row-reverse'}`}>
        <div className={`${bulletin.Address !== Address ? 'mr-auto' : 'ml-auto'}`}>
          <span className={`w-full text-base text-slate-800 dark:text-slate-200`} >
            {bulletin.Content}
          </span>
        </div>
      </div >
    </div>
  )
}

export default ChannelBulletin