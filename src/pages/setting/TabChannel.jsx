import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { SettingPageTab } from '../../lib/AppConst'
import TextInput from '../../components/Form/TextInput'
import TextTimestamp from '../../components/TextTimestamp'
import { IoCloseOutline } from "react-icons/io5"
import AvatarName from '../../components/AvatarName'
import { GrChannel } from "react-icons/gr"
import AvatarImage from '../../components/AvatarImage'

export default function TabChannel() {
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [channelName, setChannelName] = useState('')
  const [speakerCandidate, setSpeakerCandidate] = useState([])

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { Address, ContactList, activeTabSetting } = useSelector(state => state.User)
  const { ComposeSpeakerList, ChannelList } = useSelector(state => state.Messenger)

  useEffect(() => {
    if (activeTabSetting === SettingPageTab.Channel) {
      let tmp = [...ContactList]
      tmp.unshift({ Address: Address, Nickname: 'Me' })
      setSpeakerCandidate(tmp)
    }
  }, [dispatch, activeTabSetting])

  // channel
  const addComposeSpeaker = async (address) => {
    dispatch({
      type: 'ComposeSpeakerAdd',
      payload: {
        address: address
      }
    })
  }

  const delComposeSpeaker = async (address) => {
    dispatch({
      type: 'ComposeSpeakerDel',
      payload: {
        address: address
      }
    })
  }

  const createChannel = async () => {
    dispatch({
      type: 'CreateChannel',
      payload: {
        name: channelName
      }
    })
    setChannelName('')
    setShowCreateChannel(false)
  }

  const deleteChannel = async (name) => {
    dispatch({
      type: 'DeleteChannel',
      payload: { name: name }
    })
  }

  return (
    <div className="tab-page">
      {
        showCreateChannel &&
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-5 backdrop-blur-sm`}>
          <div className="flex flex-row items-center justify-center">
            <button onClick={() => setShowCreateChannel(false)} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
              <IoCloseOutline className='icon' /> cancel
            </button>
          </div>
          <div className="mx-auto flex flex-col mt-4">
            <div className="card-title">
              Create Channel
            </div>
            <div className="max-w-7xl overflow-x-auto overflow-y-auto whitespace-normal break-words p-2 rounded-xl shadow-2xl items-center">
              <TextInput label={'Channel Name:'} value={channelName} onChange={(e) => setChannelName(e.target.value.trim())} />
              {
                ComposeSpeakerList.length > 0 ?
                  <div className='flex flex-wrap'>
                    {
                      ComposeSpeakerList.map((speaker, index) => (
                        <div key={speaker} className='mt-1 px-1 flex flex-col justify-center items-center' onClick={() => delComposeSpeaker(speaker)}>
                          <AvatarImage address={speaker} timestamp={Date.now()} style={'avatar'} />
                          <AvatarName address={speaker} />
                        </div>
                      ))
                    }
                  </div>
                  :
                  <div>
                    no channel speaker yet...
                  </div>
              }
              <hr />
              {
                speakerCandidate.length > 0 ?
                  <div className='flex flex-wrap'>
                    {
                      speakerCandidate.map((contact, index) => (
                        <div key={contact.Address} className='mt-1 px-1 flex flex-col justify-center items-center' onClick={() => addComposeSpeaker(contact.Address)}>
                          <AvatarImage address={contact.Address} timestamp={Date.now()} style={'avatar-sm'} />
                          <div>
                            <span className='avatar-name text-xs' title={contact.Address}>
                              {contact.Nickname}
                            </span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                  :
                  <div>
                    no contact yet...
                  </div>
              }
            </div>
            <button
              className="btn-primary"
              disabled={ComposeSpeakerList.length === 0}
              onClick={() => createChannel()}>
              Create
            </button>
          </div>
        </div>
      }

      <div className="mx-auto flex flex-col mt-4">
        <div className="card-title row-center-middle">
          {SettingPageTab.Channel}
          <GrChannel className="card-icon" onClick={() => setShowCreateChannel(true)} />
        </div>

        <div className="min-w-full p-2 flex gap-1 rounded-lg shadow-xl justify-center">
          <div className={`mt-1 flex-1`}>
            <div className='flex flex-col'>
              {
                ChannelList.length > 0 ?
                  <div className={`table-container`}>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="">
                        <tr className="p-2 text-center font-bold text-sm text-gray-800 dark:text-gray-300 tracking-wider">
                          <th>Name</th>
                          <th>Speaker</th>
                          <th>Created At</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {
                          ChannelList.map((channel, index) => (
                            <tr key={index} className='border border-gray-200 dark:border-gray-700 hover:bg-gray-500'>
                              <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                                {channel.Name}
                              </td>
                              <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                                <div className='flex flex-wrap'>
                                  {
                                    channel.Speaker.map((speaker, index) => (
                                      <div key={speaker} className='mt-1 px-1 flex flex-col justify-center items-center'>
                                        <AvatarImage address={speaker} timestamp={Date.now()} style={'avatar-sm'} />
                                        <AvatarName address={speaker} style={'text-xs'} />
                                      </div>
                                    ))
                                  }
                                </div>
                              </td>
                              <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                                <TextTimestamp timestamp={channel.CreatedAt} />
                              </td>
                              <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                                <button className="p-2 text-base font-bold bg-red-500 text-white rounded hover:bg-green-600"
                                  onClick={() => deleteChannel(channel.Name)}>
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                  :
                  <div>
                    no channel request...
                  </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}