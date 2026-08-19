import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { GrGroup } from 'react-icons/gr'
import { IoCloseOutline } from 'react-icons/io5'
import { MdOutlineVerifiedUser } from 'react-icons/md'
import { useTranslation } from 'react-i18next'

import AvatarImage from '../../components/AvatarImage'
import AvatarName from '../../components/AvatarName'
import EmptyState from '../../components/EmptyState'
import TextInput from '../../components/Form/TextInput'
import TextTimestamp from '../../components/TextTimestamp'
import { useConfirmPopup } from '../../hooks/useConfirmPopup'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { selectGroupData, selectUserTabGroup } from '../../selectors'
import { ConfirmContentOptions, SettingPageTab } from '../../lib/AppConst'
import { setConfirmPopup } from '../../store/slices/CommonSlice'
import {
  ComposeMemberAdd,
  ComposeMemberDel,
  CreateGroup,
  DeleteGroup,
  AcceptGroupRequest,
  LoadGroupList
} from '../../store/sagas/messenger'

export default function TabGroup() {
  const { t } = useTranslation()
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showRequest, setShowRequest] = useState(false)
  const createGroupRef = useRef(null)
  const requestRef = useRef(null)

  const [groupName, setGroupName] = useState('')

  const dispatch = useDispatch()
  const { Address, ContactList, activeTabSetting } = useSelector(selectUserTabGroup)
  const { GroupRequestList, ComposeMemberList, GroupList } = useSelector(selectGroupData)

  useEscapeKey(() => {
    setShowCreateGroup(false)
    setShowRequest(false)
  })
  useFocusTrap(createGroupRef)
  useFocusTrap(requestRef)

  useEffect(() => {
    if (activeTabSetting === SettingPageTab.Group) {
      dispatch(LoadGroupList())
    }
  }, [dispatch, activeTabSetting])

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
  }, [ConfirmPopup, dispatch])

  const confirmDelGroup = (hash) => {
    dispatch(
      setConfirmPopup({
        Content: ConfirmContentOptions.DelGroup,
        Message: t('setting.delete_group_confirm'),
        Result: false,
        Params: { Hash: hash }
      })
    )
  }

  const acceptGroupRequest = (hash) => {
    dispatch(AcceptGroupRequest({ hash }))
    setShowRequest(false)
  }

  return (
    <div className="tab-page">
      {showCreateGroup && (
        <div className={`modal-overlay`} role="dialog" aria-modal="true">
          <div ref={createGroupRef} className="max-w-2xl w-full mx-4 flex flex-col mt-4">
            <div className="modal-header-bar">
              <span className={`label text-base`}>Create Group</span>
              <button
                onClick={() => setShowCreateGroup(false)}
                className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                aria-label={t('common.close')}
              >
                <IoCloseOutline className="text-lg text-text-secondary dark:text-dark-text-secondary" />
              </button>
            </div>
            <div className="modal-content-area overflow-auto">
              <TextInput
                label={t('group.group_name')}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value.trim())}
              />
              {ComposeMemberList.length > 0 ? (
                <div className="flex flex-wrap">
                  {ComposeMemberList.map((member) => (
                    <button
                      key={member}
                      className="mt-1 px-1 flex flex-col justify-center items-center"
                      onClick={() => delComposeMember(member)}
                      aria-label={`Remove ${member}`}
                    >
                      <AvatarImage address={member} classNames={'avatar'} />
                      <AvatarName address={member} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-secondary/60 dark:text-dark-text-secondary/60">
                  <p className="text-sm">No group member yet</p>
                  <p className="text-xs mt-1">Tap a contact below to add them</p>
                </div>
              )}
              <hr />
              {ContactList.length > 0 ? (
                <div className="flex flex-wrap">
                  {ContactList.map((contact) => (
                    <div
                      key={contact.address}
                      className="mt-1 px-1 flex flex-col justify-center items-center"
                      onClick={() => addComposeMember(contact.address)}
                    >
                      <AvatarImage address={contact.address} classNames={'avatar-sm'} />
                      <div>
                        <span className="avatar-name text-xs" title={contact.address}>
                          {contact.nickname}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-secondary/60 dark:text-dark-text-secondary/60">
                  <p className="text-sm">No contact available</p>
                  <p className="text-xs mt-1">Add contacts first to create groups</p>
                </div>
              )}
            </div>
            <div className="flex justify-center">
              <button
                className="btn-primary btn-gold max-w-xs"
                disabled={ComposeMemberList.length === 0}
                onClick={() => createGroup()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      {showRequest && (
        <div className={`modal-overlay`} role="dialog" aria-modal="true">
          <div ref={requestRef} className="max-w-4xl w-full mx-4 flex flex-col mt-4">
            <div className="modal-header-bar">
              <span className={`label text-base`}>Group Requests</span>
              <button
                onClick={() => setShowRequest(false)}
                className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                aria-label={t('common.close')}
              >
                <IoCloseOutline className="text-lg text-text-secondary dark:text-dark-text-secondary" />
              </button>
            </div>
            <div className="modal-content-area">
              {GroupRequestList.length > 0 ? (
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
                      {GroupRequestList.map((request) => (
                        <tr key={request.hash} className="table-tr">
                          <td className="table-cell">{request.name}</td>
                          <td className="table-cell">
                            <div className="mt-1 pl-1 flex flex-col justify-center items-center">
                              <div className="group relative">
                                <AvatarImage address={request.created_by} classNames={'avatar'} />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs rounded bg-black/80 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                  {request.created_by}
                                </div>
                              </div>
                              <AvatarName address={request.created_by} />
                            </div>
                          </td>
                          <td className="table-cell">
                            <div className="flex flex-wrap">
                              {request.member.map((member) => (
                                <div key={member} className="mt-1 px-1 flex flex-col justify-center items-center">
                                  <div className="group relative">
                                    <AvatarImage address={member} classNames={'avatar-sm'} />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs rounded bg-black/80 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                      {member}
                                    </div>
                                  </div>
                                  <AvatarName address={member} classNames={'text-xs'} />
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="table-cell">
                            <TextTimestamp timestamp={request.created_at} />
                          </td>
                          <td className="table-cell">
                            <button
                              className="btn-sm btn-primary-outline"
                              onClick={() => acceptGroupRequest(request.hash)}
                            >
                              Join
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={<MdOutlineVerifiedUser className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
                  title={t('ui.no_group_requests')}
                  description={t('ui.pending_invitations')}
                  className="mx-auto max-w-sm mt-8"
                />
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex flex-col mt-4">
        <div className="card-title flex flex-row items-center">
          {t('setting.tab_group')}
          <button
            className="icon-action-btn"
            onClick={() => setShowCreateGroup(true)}
            aria-label={t('common.create_group')}
          >
            <GrGroup className="card-icon" />
          </button>
          <button
            className="icon-action-btn"
            onClick={() => setShowRequest(true)}
            aria-label={t('common.view_group_requests')}
          >
            <MdOutlineVerifiedUser className="card-icon" />
          </button>
        </div>

        <div className={`mt-1 flex-1`}>
          <div className="flex flex-col">
            {GroupList.length > 0 ? (
              <div className={`table-container`}>
                <table className="min-w-full divide-y divide-primary/10 dark:divide-primary/20">
                  <thead className="">
                    <tr className="table-header-row">
                      <th>{t('setting.group_name')}</th>
                      <th>{t('setting.created_by')}</th>
                      <th>{t('setting.group_member')}</th>
                      <th>{t('setting.created_at')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/10 dark:divide-primary/20">
                    {GroupList.map((group) => (
                      <tr key={group.hash} className="table-tr">
                        <td className="table-cell">{group.name}</td>
                        <td className="table-cell" title={group.created_by}>
                          <div className="mt-1 pl-1 flex flex-col justify-center items-center">
                            <div className="group relative">
                              <AvatarImage address={group.created_by} classNames={'avatar'} />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs rounded bg-black/80 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                {group.created_by}
                              </div>
                            </div>
                            <AvatarName address={group.created_by} />
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-wrap">
                            {group.member.map((member) => (
                              <div key={member} className="mt-1 px-1 flex flex-col justify-center items-center">
                                <div className="group relative">
                                  <AvatarImage address={member} classNames={'avatar-sm'} />
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs rounded bg-black/80 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                    {member}
                                  </div>
                                </div>
                                <AvatarName address={member} classNames={'text-xs'} />
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="table-cell">
                          <TextTimestamp timestamp={group.created_at} />
                        </td>
                        <td className="table-cell">
                          {group.delete_json !== null ? (
                            <div>
                              {t('setting.deleted')} <TextTimestamp timestamp={group.deleted_at} />
                            </div>
                          ) : (
                            <div>
                              {group.created_by === Address && (
                                <button className="btn-sm btn-danger" onClick={() => confirmDelGroup(group.hash)}>
                                  {t('setting.delete')}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={<GrGroup className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
                title={t('ui.no_groups')}
                description={t('ui.groups_you_create')}
                className="mx-auto max-w-sm mt-8"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
