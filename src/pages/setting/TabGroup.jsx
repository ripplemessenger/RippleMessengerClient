import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { SettingPageTab } from '../../lib/AppConst'
import TextInput from '../../components/Form/TextInput'
import TextTimestamp from '../../components/TextTimestamp'
import { IoCloseOutline } from "react-icons/io5"
import AvatarName from '../../components/AvatarName'
import { MdOutlineVerifiedUser } from "react-icons/md"
import { GrGroup } from "react-icons/gr"
import AvatarImage from '../../components/AvatarImage'

export default function TabGroup() {
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showRequest, setShowRequest] = useState(false)

  const [groupName, setGroupName] = useState('')

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { Address, ContactList, activeTabSetting } = useSelector(state => state.User)
  const { GroupRequestList, ComposeMemberList, GroupList } = useSelector(state => state.Messenger)

  useEffect(() => {
    console.log(GroupList)
    if (activeTabSetting === SettingPageTab.Group) {
    }
  }, [dispatch, activeTabSetting])

  const addComposeMember = async (address) => {
    dispatch({
      type: 'ComposeMemberAdd',
      payload: {
        address: address
      }
    })
  }

  const delComposeMember = async (address) => {
    dispatch({
      type: 'ComposeMemberDel',
      payload: {
        address: address
      }
    })
  }

  const createGroup = async () => {
    dispatch({
      type: 'CreateGroup',
      payload: {
        name: groupName
      }
    })
    setGroupName('')
    setShowCreateGroup(false)
  }

  const delGroup = async (hash) => {
    dispatch({
      type: 'DeleteGroup',
      payload: {
        hash: hash
      }
    })
  }

  const acceptGroupRequest = async (hash) => {
    dispatch({
      type: 'AcceptGroupRequest',
      payload: { hash: hash }
    })
    setShowRequest(false)
  }

  return (
    <div className="tab-page">
      {
        showCreateGroup &&
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-5 backdrop-blur-sm`}>
          <div className="flex flex-row items-center justify-center">
            <button onClick={() => setShowCreateGroup(false)} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
              <IoCloseOutline className='icon' /> cancel
            </button>
          </div>
          <div className="mx-auto flex flex-col mt-4">
            <div className="card-title">
              Create Group
            </div>
            <div className="max-w-7xl overflow-x-auto overflow-y-auto whitespace-normal break-words p-2 rounded-xl shadow-2xl items-center">
              <TextInput label={'Group Name:'} value={groupName} onChange={(e) => setGroupName(e.target.value.trim())} />
              {
                ComposeMemberList.length > 0 ?
                  <div className='flex flex-wrap'>
                    {
                      ComposeMemberList.map((member, index) => (
                        <div key={member} className='mt-1 px-1 flex flex-col justify-center items-center' onClick={() => delComposeMember(member)}>
                          <AvatarImage address={member} timestamp={Date.now()} style={'avatar'} />
                          <AvatarName address={member} />
                        </div>
                      ))
                    }
                  </div>
                  :
                  <div>
                    no group member yet...
                  </div>
              }
              <hr />
              {
                ContactList.length > 0 ?
                  <div className='flex flex-wrap'>
                    {
                      ContactList.map((contact, index) => (
                        <div key={contact.Address} className='mt-1 px-1 flex flex-col justify-center items-center' onClick={() => addComposeMember(contact.Address)}>
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
              disabled={ComposeMemberList.length === 0}
              onClick={() => createGroup()}>
              Create
            </button>
          </div>
        </div>
      }
      {
        showRequest &&
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-5 backdrop-blur-sm`}>
          <div className="flex flex-row items-center justify-center">
            <button onClick={() => setShowRequest(false)} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
              <IoCloseOutline className='icon' /> cancel
            </button>
          </div>
          {
            GroupRequestList.length > 0 ?
              <div className={`table-container`}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="">
                    <tr className="p-2 text-center font-bold text-sm text-gray-800 dark:text-gray-300 tracking-wider">
                      <th>Name</th>
                      <th>Created By</th>
                      <th>Member</th>
                      <th>Created At</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {
                      GroupRequestList.map((request, index) => (
                        <tr key={index} className='border border-gray-200 dark:border-gray-700 hover:bg-gray-500'>
                          <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                            {request.Name}
                          </td>
                          <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                            <div className='mt-1 pl-1 flex flex-col justify-center items-center'>
                              <AvatarImage address={request.CreatedBy} timestamp={Date.now()} style={'avatar'} />
                              <AvatarName address={request.CreatedBy} />
                            </div>
                          </td>
                          <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                            <div className='flex flex-wrap'>
                              {
                                request.Member.map((member, index) => (
                                  <div key={member} className='mt-1 px-1 flex flex-col justify-center items-center'>
                                    <AvatarImage address={member} timestamp={Date.now()} style={'avatar-sm'} />
                                    <AvatarName address={member} style={'text-xs'} />
                                  </div>
                                ))
                              }
                            </div>
                          </td>
                          <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                            <TextTimestamp timestamp={request.CreatedAt} />
                          </td>
                          <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                            <button className="p-2 text-base font-bold bg-green-500 text-white rounded hover:bg-green-600"
                              onClick={() => acceptGroupRequest(request.Hash)}>
                              Join
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
                no group request...
              </div>
          }
        </div>
      }

      <div className="mx-auto flex flex-col mt-4">
        <div className="card-title row-center-middle">
          {SettingPageTab.Group}
          <GrGroup className="card-icon" onClick={() => setShowCreateGroup(true)} />
          <MdOutlineVerifiedUser className="card-icon" onClick={() => setShowRequest(true)} />
        </div>

        <div className="min-w-full p-2 flex gap-1 rounded-lg shadow-xl justify-center">
          <div className={`mt-1 flex-1`}>
            <div className='flex flex-row'>
            </div>
            <div className='flex flex-col'>
              {
                GroupList.length > 0 ?
                  <div className={`table-container`}>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="">
                        <tr className="p-2 text-center font-bold text-sm text-gray-800 dark:text-gray-300 tracking-wider">
                          <th>Group Name</th>
                          <th>Created By</th>
                          <th>Group Member</th>
                          <th>Created At</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {
                          GroupList.map((group, index) => (
                            <tr key={index} className='border border-gray-200 dark:border-gray-700 hover:bg-gray-500'>
                              <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                                {group.Name}
                              </td>
                              <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300"
                                title={group.CreatedBy}>
                                <div className='mt-1 pl-1 flex flex-col justify-center items-center'>
                                  <AvatarImage address={group.CreatedBy} timestamp={Date.now()} style={'avatar'} />
                                  <AvatarName address={group.CreatedBy} />
                                </div>
                              </td>
                              <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                                <div className='flex flex-wrap'>
                                  {
                                    group.Member.map((member, index) => (
                                      <div key={member} className='mt-1 px-1 flex flex-col justify-center items-center'>
                                        <AvatarImage address={member} timestamp={Date.now()} style={'avatar-sm'} />
                                        <AvatarName address={member} style={'text-xs'} />
                                      </div>
                                    ))
                                  }
                                </div>
                              </td>
                              <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                                <TextTimestamp timestamp={group.CreatedAt} />
                              </td>
                              <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                                {
                                  group.DeleteJson !== undefined ?
                                    <div>
                                      Deleted <TextTimestamp timestamp={group.DeletedAt} />
                                    </div>
                                    :
                                    <div>
                                      {
                                        group.CreatedBy === Address && <button className="p-2 text-base font-bold bg-red-500 text-white rounded hover:bg-green-600"
                                          onClick={() => delGroup(group.Hash)}>
                                          Delete
                                        </button>}
                                    </div>
                                }
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                  :
                  <div>
                    no group yet...
                  </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}