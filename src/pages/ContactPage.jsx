import { useState, useEffect, useRef, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { AiOutlineUserAdd } from 'react-icons/ai'
import { GrGroup } from 'react-icons/gr'
import {
  IoChatboxEllipsesOutline,
  IoChevronDownOutline,
  IoCloseOutline,
  IoNewspaperOutline,
  IoPeopleOutline
} from 'react-icons/io5'
import { MdOutlineVerifiedUser } from 'react-icons/md'
import { useTranslation } from 'react-i18next'

import AvatarImage from '../components/AvatarImage'
import AvatarName from '../components/AvatarName'
import EmptyState from '../components/EmptyState'
import TextInput from '../components/Form/TextInput'
import TextTimestamp from '../components/TextTimestamp'
import ToggleSwitch from '../components/ToggleSwitch'
import { useConfirmPopup } from '../hooks/useConfirmPopup'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { ConfirmContentOptions, SessionType } from '../lib/AppConst'
import { setConfirmPopup } from '../store/slices/CommonSlice'
import { setBulletinAddress } from '../store/slices/MessengerSlice'
import {
  ContactAdd,
  ContactDel,
  ContactToggleIsFollow,
  ContactToggleIsFriend,
  LoadContactList,
  ComposeMemberAdd,
  ComposeMemberDel,
  CreateGroup,
  DeleteGroup,
  AcceptGroupRequest,
  LoadGroupList,
  LoadCurrentSession
} from '../store/sagas/messenger.actions'
import { selectTabContactData, selectGroupData, selectUserAddress } from '../selectors'

export default function ContactPage() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const { ContactList } = useSelector(selectTabContactData)
  const userAddress = useSelector(selectUserAddress)
  const { GroupRequestList, ComposeMemberList, GroupList } = useSelector(selectGroupData)

  const [showAddContact, setShowAddContact] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showRequest, setShowRequest] = useState(false)
  const [view, setView] = useState('contact')
  const [contactAddress, setContactAddress] = useState('')
  const [contactNickname, setContactNickname] = useState('')
  const [groupName, setGroupName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const hideTimer = useRef(null)

  const handleDropdownEnter = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setShowDropdown(true)
  }, [])

  const handleDropdownLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => setShowDropdown(false), 200)
  }, [])

  const addContactRef = useRef(null)
  const createGroupRef = useRef(null)
  const requestRef = useRef(null)

  const filteredContacts = ContactList.filter((c) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return c.nickname?.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
  })

  const filteredGroups = (GroupList || []).filter((g) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return g.name?.toLowerCase().includes(q)
  })

  useEscapeKey(() => {
    setShowAddContact(false)
    setShowCreateGroup(false)
    setShowRequest(false)
  })
  useFocusTrap(addContactRef)
  useFocusTrap(createGroupRef)
  useFocusTrap(requestRef)

  useEffect(() => {
    dispatch(LoadContactList())
    dispatch(LoadGroupList())
  }, [dispatch])

  const addContact = useCallback(() => {
    dispatch(
      ContactAdd({
        address: contactAddress,
        nickname: contactNickname
      })
    )
    setContactAddress('')
    setContactNickname('')
    setShowAddContact(false)
  }, [dispatch, contactAddress, contactNickname])

  const createGroup = useCallback(() => {
    if (groupName !== '') {
      dispatch(CreateGroup({ name: groupName }))
      setGroupName('')
      setShowCreateGroup(false)
    }
  }, [dispatch, groupName])

  const acceptGroupRequest = useCallback(
    (hash) => {
      dispatch(AcceptGroupRequest({ hash }))
      setShowRequest(false)
    },
    [dispatch]
  )

  const toggleIsFollow = useCallback(
    (address) => {
      dispatch(ContactToggleIsFollow({ contact_address: address }))
    },
    [dispatch]
  )

  const toggleIsFriend = useCallback(
    (address) => {
      dispatch(ContactToggleIsFriend({ contact_address: address }))
    },
    [dispatch]
  )

  const ConfirmPopup = useConfirmPopup()
  useEffect(() => {
    if (ConfirmPopup?.Content === ConfirmContentOptions.DelContact && ConfirmPopup?.Result) {
      dispatch(ContactDel({ contact_address: ConfirmPopup?.Params?.Address }))
      dispatch(setConfirmPopup(null))
    }
    if (ConfirmPopup?.Content === ConfirmContentOptions.DelGroup && ConfirmPopup?.Result) {
      dispatch(DeleteGroup({ hash: ConfirmPopup?.Params?.Hash }))
      dispatch(setConfirmPopup(null))
    }
  }, [ConfirmPopup, dispatch])

  const confirmDelContact = useCallback(
    (address) => {
      dispatch(
        setConfirmPopup({
          Content: ConfirmContentOptions.DelContact,
          Message: t('setting.remove_contact_confirm'),
          Result: false,
          Params: { Address: address }
        })
      )
    },
    [dispatch, t]
  )

  const confirmDelGroup = useCallback(
    (hash) => {
      dispatch(
        setConfirmPopup({
          Content: ConfirmContentOptions.DelGroup,
          Message: t('setting.delete_group_confirm'),
          Result: false,
          Params: { Hash: hash }
        })
      )
    },
    [dispatch, t]
  )

  const gotoBulletin = useCallback(
    (address) => {
      dispatch(setBulletinAddress(address))
      navigate('/bulletin_address')
    },
    [dispatch, navigate]
  )

  const gotoChat = useCallback(
    (address) => {
      dispatch(LoadCurrentSession({ type: SessionType.Private, address }))
      navigate('/chat')
    },
    [dispatch, navigate]
  )

  const addComposeMember = useCallback(
    (address) => {
      dispatch(ComposeMemberAdd({ address }))
    },
    [dispatch]
  )

  const delComposeMember = useCallback(
    (address) => {
      dispatch(ComposeMemberDel({ address }))
    },
    [dispatch]
  )

  return (
    <div className="page-wrapper">
      <div className="tab-page">
        <div className="page-inner w-auto items-center">
          {/* Add contact modal */}
          {showAddContact && (
            <div className={`modal-overlay`} role="dialog" aria-modal="true">
              <div ref={addContactRef} className="max-w-md w-full mx-4 flex flex-col mt-4">
                <div className="modal-header-bar">
                  <span className={`label text-base`}>{t('contact.add_update_contact')}</span>
                  <button
                    onClick={() => setShowAddContact(false)}
                    className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                    aria-label={t('common.close')}
                  >
                    <IoCloseOutline className="text-lg text-text-secondary dark:text-dark-text-secondary" />
                  </button>
                </div>
                <div className="modal-content-area gap-3">
                  <TextInput
                    label={t('auth.address')}
                    value={contactAddress}
                    onChange={(e) => setContactAddress(e.target.value.trim())}
                  />
                  <TextInput
                    label={t('ui.nickname')}
                    value={contactNickname}
                    onChange={(e) => setContactNickname(e.target.value.trim())}
                  />
                  <div className="flex justify-center">
                    <button
                      className="btn-primary btn-gold max-w-xs"
                      disabled={contactAddress === ''}
                      onClick={() => addContact()}
                    >
                      {t('contact.add_update')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create group modal */}
          {showCreateGroup && (
            <div className={`modal-overlay`} role="dialog" aria-modal="true">
              <div ref={createGroupRef} className="max-w-2xl w-full mx-4 flex flex-col mt-4">
                <div className="modal-header-bar">
                  <span className={`label text-base`}>{t('group.create_group')}</span>
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
                          aria-label={t('group.remove_member', { member })}
                        >
                          <AvatarImage address={member} classNames={'avatar'} />
                          <AvatarName address={member} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-text-secondary/60 dark:text-dark-text-secondary/60">
                      <p className="text-sm">{t('group.no_member_yet')}</p>
                      <p className="text-xs mt-1">{t('group.tap_contact_add')}</p>
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
                      <p className="text-sm">{t('group.no_contact_available')}</p>
                      <p className="text-xs mt-1">{t('group.add_contact_first')}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-center">
                  <button
                    className="btn-primary btn-gold max-w-xs"
                    disabled={ComposeMemberList.length === 0}
                    onClick={() => createGroup()}
                  >
                    {t('group.create')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Group request modal */}
          {showRequest && (
            <div className={`modal-overlay`} role="dialog" aria-modal="true">
              <div ref={requestRef} className="max-w-4xl w-full mx-4 flex flex-col mt-4">
                <div className="modal-header-bar">
                  <span className={`label text-base`}>{t('group.requests')}</span>
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
                            <th>{t('group.name')}</th>
                            <th>{t('group.created_by')}</th>
                            <th>{t('group.member')}</th>
                            <th>{t('group.created_at')}</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-primary/10 dark:divide-primary/20">
                          {GroupRequestList.map((request) => (
                            <tr key={request.hash} className="table-tr">
                              <td className="table-cell">{request.name}</td>
                              <td className="table-cell min-w-[100px]">
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
                                  {t('group.join')}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      icon={
                        <MdOutlineVerifiedUser className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />
                      }
                      title={t('ui.no_group_requests')}
                      description={t('ui.pending_invitations')}
                      className="mx-auto max-w-sm mt-8"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Title bar — matching Bulletin page layout */}
          <div className="card-title flex flex-row items-center mb-1">
            <div className="relative" onMouseEnter={handleDropdownEnter} onMouseLeave={handleDropdownLeave}>
              <button
                className={`text-lg font-bold flex items-center gap-1 transition-colors ${showDropdown ? 'text-primary dark:text-dark-primary' : 'text-text-primary dark:text-dark-text-primary'}`}
                aria-label={view === 'contact' ? t('common.contact') : t('setting.tab_group')}
              >
                {view === 'contact' ? t('common.contact') : t('setting.tab_group')}
                <IoChevronDownOutline className="text-sm opacity-50" />
              </button>
              <div
                className={`absolute left-0 top-full pt-1 min-w-[140px] z-50 transition-opacity ${showDropdown ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
              >
                <div className="bg-surface dark:bg-dark-surface border border-primary/20 dark:border-primary/30 rounded-lg shadow-lg overflow-hidden">
                  <button
                    onClick={() => setView('contact')}
                    className={`flex items-center gap-2 px-3 py-2 text-sm w-full text-left transition-colors ${
                      view === 'contact'
                        ? 'text-primary dark:text-dark-primary font-medium bg-primary/10 dark:bg-dark-primary/10'
                        : 'text-text-primary dark:text-dark-text-primary hover:bg-primary/10 dark:hover:bg-dark-primary/10'
                    }`}
                  >
                    <IoPeopleOutline className="w-4 h-4" />
                    {t('common.contact')}
                  </button>
                  <button
                    onClick={() => setView('group')}
                    className={`flex items-center gap-2 px-3 py-2 text-sm w-full text-left transition-colors ${
                      view === 'group'
                        ? 'text-primary dark:text-dark-primary font-medium bg-primary/10 dark:bg-dark-primary/10'
                        : 'text-text-primary dark:text-dark-text-primary hover:bg-primary/10 dark:hover:bg-dark-primary/10'
                    }`}
                  >
                    <GrGroup className="w-4 h-4" />
                    {t('setting.tab_group')}
                  </button>
                </div>
              </div>
            </div>
            {/* Contact view: Add contact */}
            {view === 'contact' && (
              <button
                className="icon-action-btn"
                onClick={() => setShowAddContact(true)}
                aria-label={t('common.add_contact')}
                title={t('common.add_contact')}
              >
                <AiOutlineUserAdd className="card-icon" />
              </button>
            )}
            {/* Group view: Create group */}
            {view === 'group' && (
              <button
                className="icon-action-btn"
                onClick={() => setShowCreateGroup(true)}
                aria-label={t('common.create_group')}
                title={t('common.create_group')}
              >
                <GrGroup className="card-icon" />
              </button>
            )}
            {/* Group view: Group invitation (only if pending) */}
            {view === 'group' && GroupRequestList.length > 0 && (
              <button
                className="icon-action-btn"
                onClick={() => setShowRequest(true)}
                aria-label={t('common.view_group_requests')}
                title={t('common.view_group_requests')}
              >
                <MdOutlineVerifiedUser className="card-icon" />
              </button>
            )}
          </div>

          {/* Search */}
          {(view === 'contact' ? ContactList.length > 0 : (GroupList || []).length > 0) && (
            <div className="pb-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={view === 'contact' ? t('ui.search_contact') : t('ui.search_group')}
                className="max-w-xs px-2 py-1 text-sm border rounded-lg bg-white dark:bg-gray-900 border-primary/20 dark:border-primary/30 text-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          )}

          {/* Contact list / Group list */}
          <div className="flex justify-center">
            {view === 'contact' ? (
              filteredContacts.length > 0 ? (
                <div className={`table-container`}>
                  <table className="divide-y divide-primary/10 dark:divide-primary/20">
                    <thead>
                      <tr className="text-center font-bold text-xs text-primary dark:text-dark-primary tracking-wider">
                        <th className="px-2 py-1">{t('setting.avatar')}</th>
                        <th className="px-1 py-1">{t('setting.follow')}</th>
                        <th className="px-1 py-1">{t('setting.friend')}</th>
                        <th className="px-2 py-1">{t('setting.timestamp')}</th>
                        <th className="px-1 py-1"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/10 dark:divide-primary/20">
                      {filteredContacts.map((contact) => (
                        <tr key={contact.address} className="table-tr">
                          <td
                            className="px-2 py-1.5 text-text-primary dark:text-dark-text-primary"
                            title={contact.address}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <AvatarImage address={contact.address} classNames="avatar" />
                              <AvatarName address={contact.address} />
                            </div>
                          </td>
                          <td className="px-1 py-1.5 text-text-primary dark:text-dark-text-primary">
                            <ToggleSwitch
                              isChecked={contact.is_follow}
                              onClick={() => toggleIsFollow(contact.address)}
                              ariaLabel={`Follow ${contact.nickname}`}
                            />
                          </td>
                          <td className="px-1 py-1.5 text-text-primary dark:text-dark-text-primary">
                            <ToggleSwitch
                              isChecked={contact.is_friend}
                              onClick={() => toggleIsFriend(contact.address)}
                              ariaLabel={`Friend ${contact.nickname}`}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-text-primary dark:text-dark-text-primary">
                            <TextTimestamp timestamp={contact.updated_at} />
                          </td>
                          <td className="px-1 py-1.5 text-text-primary dark:text-dark-text-primary">
                            <div className="flex gap-0.5">
                              {contact.is_follow && (
                                <button
                                  className="icon-action-btn"
                                  onClick={() => gotoBulletin(contact.address)}
                                  title={t('common.bulletin')}
                                  aria-label={t('common.bulletin')}
                                >
                                  <IoNewspaperOutline className="card-icon" />
                                </button>
                              )}
                              {contact.is_friend && (
                                <button
                                  className="icon-action-btn"
                                  onClick={() => gotoChat(contact.address)}
                                  title={t('common.chat')}
                                  aria-label={t('common.chat')}
                                >
                                  <IoChatboxEllipsesOutline className="card-icon" />
                                </button>
                              )}
                              {contact.is_follow === false && contact.is_friend === false && (
                                <button
                                  className="btn-sm btn-danger"
                                  onClick={() => confirmDelContact(contact.address)}
                                >
                                  {t('setting.delete')}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={<AiOutlineUserAdd className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
                  title={t('ui.no_contact')}
                  description={t('ui.add_contact')}
                  className="mx-auto max-w-sm mt-8"
                />
              )
            ) : filteredGroups.length > 0 ? (
              <div className={`table-container`}>
                <table className="divide-y divide-primary/10 dark:divide-primary/20">
                  <thead>
                    <tr className="text-center font-bold text-xs text-primary dark:text-dark-primary tracking-wider">
                      <th className="px-2 py-1">{t('setting.group_name')}</th>
                      <th className="px-2 py-1">{t('setting.created_by')}</th>
                      <th className="px-2 py-1">{t('setting.group_member')}</th>
                      <th className="px-2 py-1">{t('setting.created_at')}</th>
                      <th className="px-1 py-1"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/10 dark:divide-primary/20">
                    {filteredGroups.map((group) => (
                      <tr key={group.hash} className="table-tr">
                        <td className="px-2 py-1.5 text-text-primary dark:text-dark-text-primary">{group.name}</td>
                        <td
                          className="px-2 py-1.5 text-text-primary dark:text-dark-text-primary"
                          title={group.created_by}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <AvatarImage address={group.created_by} classNames="avatar" />
                            <AvatarName address={group.created_by} />
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-text-primary dark:text-dark-text-primary max-w-[400px]">
                          <div className="flex flex-wrap gap-1">
                            {group.member.map((member) => (
                              <div key={member} className="flex flex-col items-center" title={member}>
                                <AvatarImage address={member} classNames="avatar-sm" />
                                <AvatarName address={member} classNames="text-xs" />
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-text-primary dark:text-dark-text-primary">
                          <TextTimestamp timestamp={group.created_at} />
                        </td>
                        <td className="px-1 py-1.5 text-text-primary dark:text-dark-text-primary">
                          <div className="flex gap-0.5">
                            {group.delete_json !== null ? (
                              <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
                                {t('setting.deleted')}
                              </span>
                            ) : (
                              group.created_by === userAddress && (
                                <button className="btn-sm btn-danger" onClick={() => confirmDelGroup(group.hash)}>
                                  {t('setting.delete')}
                                </button>
                              )
                            )}
                          </div>
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
