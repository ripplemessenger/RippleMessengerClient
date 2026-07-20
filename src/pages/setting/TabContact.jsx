import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AiOutlineUserAdd } from 'react-icons/ai'
import { IoCloseOutline } from 'react-icons/io5'

import AvatarImage from '../../components/AvatarImage'
import AvatarName from '../../components/AvatarName'
import EmptyState from '../../components/EmptyState'
import TextInput from '../../components/Form/TextInput'
import TextTimestamp from '../../components/TextTimestamp'
import ToggleSwitch from '../../components/ToggleSwitch'
import { useConfirmPopup } from '../../hooks/useConfirmPopup'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { ConfirmContentOptions, SettingPageTab } from '../../lib/AppConst'
import { setConfirmPopup } from '../../store/slices/CommonSlice'
import { ContactAdd, ContactDel, ContactToggleIsFollow, ContactToggleIsFriend, LoadContactList } from '../../store/sagas/messenger.actions'
import { selectTabContactData } from '../../selectors'

export default function TabContact() {
  const [contactAddress, setContactAddress] = useState('')
  const [contactNickname, setContactNickname] = useState('')
  const [showAddContact, setShowAddContact] = useState(false)

  const dispatch = useDispatch()
  const { ContactList, activeTabSetting } = useSelector(selectTabContactData)

  useEscapeKey(() => setShowAddContact(_ => false))

  useEffect(() => {
    if (activeTabSetting === SettingPageTab.Contact) {
      dispatch(LoadContactList())
    }
  }, [dispatch, activeTabSetting])

  const addContact = () => {
    dispatch(ContactAdd({
      address: contactAddress,
      nickname: contactNickname
    }))
    setContactAddress('')
    setContactNickname('')
    setShowAddContact(false)
  }

  const ConfirmPopup = useConfirmPopup()
  useEffect(() => {
    if (ConfirmPopup?.Content === ConfirmContentOptions.DelContact && ConfirmPopup?.Result) {
      dispatch(ContactDel({ contact_address: ConfirmPopup?.Params?.Address }))
      dispatch(setConfirmPopup(null))
    }
  }, [ConfirmPopup])

  const confirmDelContact = (address) => {
    dispatch(setConfirmPopup({ Content: ConfirmContentOptions.DelContact, Result: false, Params: { Address: address } }))
  }

  const toggleIsFollow = (address) => {
    dispatch(ContactToggleIsFollow({ contact_address: address }))
  }

  const toggleIsFriend = (address) => {
    dispatch(ContactToggleIsFriend({ contact_address: address }))
  }

  return (
    <div className="tab-page">
      {
        showAddContact &&
        <div className={`modal-overlay`} role="dialog" aria-modal="true">
          <div className="max-w-md w-full mx-4 flex flex-col mt-4">
            <div className="modal-header-bar">
              <span className={`label text-base`}>Add/Update Contact</span>
              <button onClick={() => setShowAddContact(false)} className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors" aria-label="Close">
                <IoCloseOutline className="text-lg text-text-secondary dark:text-dark-text-secondary" />
              </button>
            </div>
            <div className="modal-content-area gap-3">
              <TextInput label={'Address:'} value={contactAddress} onChange={(e) => setContactAddress(e.target.value.trim())} />
              <TextInput label={'Nickname:'} value={contactNickname} onChange={(e) => setContactNickname(e.target.value.trim())} />
              <div className="flex justify-center">
                <button
                  className="btn-primary btn-gold max-w-xs"
                  disabled={contactAddress === '' || contactNickname === ''}
                  onClick={() => addContact()}>
                  Add/Update
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <div className="mx-auto flex flex-col mt-4">
        <div className="card-title flex flex-row items-center">
          {SettingPageTab.Contact}
          <button className="icon-action-btn" onClick={() => setShowAddContact(true)} aria-label="Add contact">
            <AiOutlineUserAdd className="card-icon" />
          </button>
        </div>

        <div className="min-w-full rounded-xl card">
          {ContactList.length > 0 ? (
            <div className={`table-container`}>
              <table className="min-w-full divide-y divide-primary/10 dark:divide-primary/20">
                <thead>
                  <tr className="text-center font-bold text-sm text-primary dark:text-dark-primary tracking-wider">
                    <th>Avatar</th>
                    <th>Follow</th>
                    <th>Friend</th>
                    <th>Timestamp</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10 dark:divide-primary/20">
                  {ContactList.map((contact) => (
                    <tr key={contact.address} className="table-tr">
                      <td className="p-3 text-text-primary dark:text-dark-text-primary" title={contact.address}>
                        <div className="mt-1 px-1 flex flex-col justify-center items-center">
                          <AvatarImage address={contact.address} classNames="avatar" />
                          <AvatarName address={contact.address} />
                        </div>
                      </td>
                      <td className="p-3 text-text-primary dark:text-dark-text-primary">
                        <ToggleSwitch isChecked={contact.is_follow} onClick={() => toggleIsFollow(contact.address)} ariaLabel={`Follow ${contact.nickname}`} />
                      </td>
                      <td className="p-3 text-text-primary dark:text-dark-text-primary">
                        <ToggleSwitch isChecked={contact.is_friend} onClick={() => toggleIsFriend(contact.address)} ariaLabel={`Friend ${contact.nickname}`} />
                      </td>
                      <td className="p-3 text-text-primary dark:text-dark-text-primary">
                        <TextTimestamp timestamp={contact.updated_at} />
                      </td>
                      <td className="p-3 text-text-primary dark:text-dark-text-primary">
                        {contact.is_follow === false && contact.is_friend === false && (
                          <button className="btn-sm btn-danger"
                            onClick={() => confirmDelContact(contact.address)}>
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<AiOutlineUserAdd className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
              title="No contact yet"
              description="Add a contact to start connecting"
              className="mx-auto max-w-sm mt-8"
            />
          )}
        </div>
      </div>
    </div>
  )
}