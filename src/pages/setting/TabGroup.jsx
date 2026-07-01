import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { GrGroup } from 'react-icons/gr'
import { IoCloseOutline } from 'react-icons/io5'
import { MdOutlineVerifiedUser } from 'react-icons/md'

import AvatarImage from '../../components/AvatarImage'
import AvatarName from '../../components/AvatarName'
import EmptyState from '../../components/EmptyState'
import TextInput from '../../components/Form/TextInput'
import TextTimestamp from '../../components/TextTimestamp'
import { useConfirmPopup } from '../../hooks/useConfirmPopup'
import { ConfirmContentOptions, SettingPageTab } from '../../lib/AppConst'
import { setConfirmPopup } from '../../store/slices/CommonSlice'
import { ComposeMemberAdd, ComposeMemberDel, CreateGroup, DeleteGroup, AcceptGroupRequest } from '../../store/sagas/messenger'

export default function TabGroup() {
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showRequest, setShowRequest] = useState(false)

  const [groupName, setGroupName] = useState('')

  const dispatch = useDispatch()
  const { Address, ContactList } = useSelector(state => state.User)
  const { GroupRequestList, ComposeMemberList, GroupList } = useSelector(state => state.Messenger)

  const addComposeMember = (address) => {
    dispatch(ComposeMemberAdd({ address }))
  }

  const delComposeMember = (address) => {
    dispatch(ComposeMemberDel({ address }))
  }

  const createGroup = () => {
    if (groupName !== '') {
      dispatch(CreateGroup({ name: groupName }))
      setGroupName('')
      setShowCreateGroup(false)
    }
  }

  const ConfirmPopup = useConfirmPopup()
  useEffect(() => {
    if (ConfirmPopup?.Content === ConfirmContentOptions.DelGroup && ConfirmPopup?.Result) {
      dispatch(DeleteGroup({ hash: ConfirmPopup?.Params?.Hash }))
      dispatch(setConfirmPopup(null))
    }
  }, [ConfirmPopup])

  const confirmDelGroup = (hash) => {
    dispatch(setConfirmPopup({ Content: ConfirmContentOptions.DelGroup, Result: false, Params: { Hash: hash } }))
  }

  const acceptGroupRequest = (hash) => {
    dispatch(AcceptGroupRequest({ hash }))
    setShowRequest(false)
  }

  return (
    <div className="tab-page">
      {
        showCreateGroup &&
        <div className={`modal-overlay`}>
          <div className="modal-action-row">
            <button onClick={() => setShowCreateGroup(false)} className="modal-btn-gray">
              <IoCloseOutline className='icon' /> cancel
            </button>
          </div>
          <div className="mx-auto flex flex-col mt-4">
            <div className="card-title">
              Create Group
            </div>
            <div className="modal-content-wrapper max-w-7xl overflow-auto">
              <TextInput label={'Group Name:'} value={groupName} onChange={(e) => setGroupName(e.target.value.trim())} />
              {
                ComposeMemberList.length > 0 ?
                  <div className='flex flex-wrap'>
                    {
                      ComposeMemberList.map((member, index) => (
                        <button key={member} className='mt-1 px-1 flex flex-col justify-center items-center' onClick={() => delComposeMember(member)} aria-label={`Remove ${member}`}>
                          <AvatarImage address={member} classNames={'avatar'} />
                          <AvatarName address={member} />
                        </button>
                      ))
                    }
                  </div>
                  :
                  <div className="text-center py-8 text-text-secondary/60 dark:text-dark-text-secondary/60">
                    <p className="text-sm">No group member yet</p>
                    <p className="text-xs mt-1">Tap a contact below to add them</p>
                  </div>
              }
              <hr />
              {
                ContactList.length > 0 ?
                  <div className='flex flex-wrap'>
                    {
                      ContactList.map((contact, index) => (
                        <div key={contact.address} className='mt-1 px-1 flex flex-col justify-center items-center' onClick={() => addComposeMember(contact.address)}>
                          <AvatarImage address={contact.address} classNames={'avatar-sm'} />
                          <div>
                            <span className='avatar-name text-xs' title={contact.address}>
                              {contact.nickname}
                            </span>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                  :
                  <div className="text-center py-8 text-text-secondary/60 dark:text-dark-text-secondary/60">
                    <p className="text-sm">No contact available</p>
                    <p className="text-xs mt-1">Add contacts first to create groups</p>
                  </div>
              }
            </div>
            <button
              className="btn-primary btn-green"
              disabled={ComposeMemberList.length === 0}
              onClick={() => createGroup()}>
              Create
            </button>
          </div>
        </div>
      }
      {
        showRequest &&
        <div className={`modal-overlay`}>
          <div className="modal-action-row">
            <button onClick={() => setShowRequest(false)} className="modal-btn-gray">
              <IoCloseOutline className='icon' /> cancel
            </button>
          </div>
          {
            GroupRequestList.length > 0 ?
              <div className={`table-container`}>
                <table className="min-w-full divide-y divide-primary/10 dark:divide-primary/20">
                  <thead className="">
                    <tr className="table-header-row">
                      <th>Name</th>
                      <th>Created By</th>
                      <th>Member</th>
                      <th>Created At</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/10 dark:divide-primary/20">
                    {
                      GroupRequestList.map((request) => (
                        <tr key={request.hash} className='table-tr'>
                          <td className="table-cell">
                            {request.name}
                          </td>
                          <td className="table-cell">
                            <div className='mt-1 pl-1 flex flex-col justify-center items-center'>
                              <AvatarImage address={request.created_by} classNames={'avatar'} />
                              <AvatarName address={request.created_by} />
                            </div>
                          </td>
                          <td className="table-cell">
                            <div className='flex flex-wrap'>
                              {
                                request.member.map((member, index) => (
                                  <div key={member} className='mt-1 px-1 flex flex-col justify-center items-center'>
                                    <AvatarImage address={member} classNames={'avatar-sm'} />
                                    <AvatarName address={member} classNames={'text-xs'} />
                                  </div>
                                ))
                              }
                            </div>
                          </td>
                          <td className="table-cell">
                            <TextTimestamp timestamp={request.created_at} />
                          </td>
                          <td className="table-cell">
                            <button className="btn-sm btn-primary-outline"
                              onClick={() => acceptGroupRequest(request.hash)}>
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
              <EmptyState
                icon={<MdOutlineVerifiedUser className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
                title="No group requests"
                description="Pending group invitations will appear here"
                className="mx-auto max-w-sm mt-8"
              />
          }
        </div>
      }

      <div className="mx-auto flex flex-col mt-4">
        <div className="card-title flex flex-row items-center">
          {SettingPageTab.Group}
          <button className="icon-action-btn" onClick={() => setShowCreateGroup(true)} aria-label="Create group">
            <GrGroup className="card-icon" />
          </button>
          <button className="icon-action-btn" onClick={() => setShowRequest(true)} aria-label="View group requests">
            <MdOutlineVerifiedUser className="card-icon" />
          </button>
        </div>

        <div className={`mt-1 flex-1`}>
          <div className='flex flex-col'>
            {
              GroupList.length > 0 ?
                <div className={`table-container`}>
                    <table className="min-w-full divide-y divide-primary/10 dark:divide-primary/20">
                      <thead className="">
                        <tr className="table-header-row">
                          <th>Group Name</th>
                          <th>Created By</th>
                          <th>Group Member</th>
                          <th>Created At</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-primary/10 dark:divide-primary/20">
                        {
                          GroupList.map((group) => (
                            <tr key={group.hash} className='table-tr'>
                              <td className="table-cell">
                                {group.name}
                              </td>
                              <td className="table-cell"
                                title={group.created_by}>
                                <div className='mt-1 pl-1 flex flex-col justify-center items-center'>
                                  <AvatarImage address={group.created_by} classNames={'avatar'} />
                                  <AvatarName address={group.created_by} />
                                </div>
                              </td>
                              <td className="table-cell">
                                <div className='flex flex-wrap'>
                                  {
                                    group.member.map((member, index) => (
                                      <div key={member} className='mt-1 px-1 flex flex-col justify-center items-center'>
                                        <AvatarImage address={member} classNames={'avatar-sm'} />
                                        <AvatarName address={member} classNames={'text-xs'} />
                                      </div>
                                    ))
                                  }
                                </div>
                              </td>
                              <td className="table-cell">
                                <TextTimestamp timestamp={group.created_at} />
                              </td>
                              <td className="table-cell">
                                {
                                  group.delete_json !== null ?
                                    <div>
                                      Deleted <TextTimestamp timestamp={group.deleted_at} />
                                    </div>
                                    :
                                    <div>
                                      {
                                        group.created_by === Address && <button className="btn-sm btn-danger"
                                          onClick={() => confirmDelGroup(group.hash)}>
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
                <EmptyState
                  icon={<GrGroup className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
                  title="No groups yet"
                  description="Groups you create or join will appear here"
                  className="mx-auto max-w-sm mt-8"
                />
            }
          </div>
        </div>
      </div>
    </div>
  )
}