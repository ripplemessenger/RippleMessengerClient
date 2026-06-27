import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { ConfirmContentOptions, SettingPageTab } from '../../lib/AppConst'
import TextInput from '../../components/Form/TextInput'
import ToggleSwitch from '../../components/ToggleSwitch'
import TextTimestamp from '../../components/TextTimestamp'
import AvatarImage from '../../components/AvatarImage'
import AvatarName from '../../components/AvatarName'
import { IoCloseOutline } from "react-icons/io5"
import { AiOutlineUserAdd } from "react-icons/ai"
import { AiOutlineQuestionCircle } from "react-icons/ai"
import { setConfirmPopup, setFlashNoticeMessage } from '../../store/slices/CommonSlice'

export default function TabContact() {
  const [contactAddress, setContactAddress] = useState('')
  const [contactNickname, setContactNickname] = useState('')
  const [showAddContact, setShowAddContact] = useState(false)

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { ContactList, activeTabSetting } = useSelector(state => state.User)

  useEffect(() => {
    if (activeTabSetting === SettingPageTab.Contact) {
      dispatch({ type: 'LoadContactList' })
    }
  }, [dispatch, activeTabSetting])

  const addContact = async () => {
    dispatch({
      type: 'ContactAdd',
      payload: {
        address: contactAddress,
        nickname: contactNickname
      }
    })
    setContactAddress('')
    setContactNickname('')
    setShowAddContact(false)
  }

  const { ConfirmPopup } = useSelector(state => state.Common)
  useEffect(() => {
    if (ConfirmPopup !== null && ConfirmPopup.Content === ConfirmContentOptions.DelContact && ConfirmPopup.Result) {
      dispatch({
        type: 'ContactDel',
        payload: { contact_address: ConfirmPopup.Params.Address }
      })
      dispatch(setConfirmPopup(null))
    }
  }, [ConfirmPopup])

  const confirmDelContact = (address) => {
    dispatch(setConfirmPopup({ Content: ConfirmContentOptions.DelContact, Result: false, Params: { Address: address } }))
  }

  const toggleIsFollow = async (address) => {
    dispatch({
      type: 'ContactToggleIsFollow',
      payload: { contact_address: address }
    })
  }

  const toggleIsFriend = async (address) => {
    dispatch({
      type: 'ContactToggleIsFriend',
      payload: { contact_address: address }
    })
  }

  return (
    <div className="tab-page">
      {
        showAddContact &&
        <div className={`modal-overlay`}>
          <div className="modal-action-row">
            <button onClick={() => setShowAddContact(false)} className="modal-btn-gray">
              <IoCloseOutline className='icon' /> cancel
            </button>
          </div>
          <div className="mx-auto flex flex-col mt-4">
            <div className="card-title">
              Add/Update Contact
            </div>
            <TextInput label={'Address:'} value={contactAddress} onChange={(e) => setContactAddress(e.target.value.trim())} />
            <TextInput label={'Nickname:'} value={contactNickname} onChange={(e) => setContactNickname(e.target.value.trim())} />
            <button
              className="btn-primary btn-green"
              disabled={contactAddress === '' || contactNickname === ''}
              onClick={() => addContact()}>
              Add/Update
            </button>
          </div>
        </div>
      }

      <div className="mx-auto flex flex-col mt-4">
        <div className="card-title flex flex-row items-center">
          {SettingPageTab.Contact}
          <AiOutlineUserAdd className="card-icon" onClick={() => setShowAddContact(true)} />
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
                    <th>Updated At</th>
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
                        <ToggleSwitch isChecked={contact.is_follow} onClick={() => toggleIsFollow(contact.address)} />
                      </td>
                      <td className="p-3 text-text-primary dark:text-dark-text-primary">
                        <ToggleSwitch isChecked={contact.is_friend} onClick={() => toggleIsFriend(contact.address)} />
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
            <div className="empty-state-box mx-auto max-w-sm mt-8">
              <AiOutlineUserAdd className="text-4xl text-primary/40 dark:text-dark-primary/40 mb-2" />
              <h3 className="text-lg font-medium text-text-secondary dark:text-dark-text-secondary">
                No contact yet
              </h3>
              <p className="text-xs text-text-secondary/60 dark:text-dark-text-secondary/60 mt-1">Add a contact to start connecting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}