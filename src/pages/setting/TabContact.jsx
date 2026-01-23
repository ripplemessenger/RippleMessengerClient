import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { SettingPageTab } from '../../lib/AppConst'
import TextInput from '../../components/Form/TextInput'
import ToggleSwitch from '../../components/ToggleSwitch'
import TextTimestamp from '../../components/TextTimestamp'
import AvatarImage from '../../components/AvatarImage'
import AvatarName from '../../components/AvatarName'
import { IoCloseOutline } from "react-icons/io5"
import { AiOutlineUserAdd } from "react-icons/ai"
import { AiOutlineQuestionCircle } from "react-icons/ai"
import { setFlashNoticeMessage } from '../../store/slices/UserSlice'

export default function TabContact() {
  const [contactAddress, setContactAddress] = useState('')
  const [contactNickname, setContactNickname] = useState('')
  const [showAddContact, setShowAddContact] = useState(false)

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { ContactList, activeTabSetting } = useSelector(state => state.User)

  useEffect(() => {
    console.log(ContactList)
    if (activeTabSetting === SettingPageTab.Contact) {
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

  const delContact = async (address) => {
    dispatch({
      type: 'ContactDel',
      payload: { contact_address: address }
    })
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
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-5 backdrop-blur-sm`}>
          <div className="flex flex-row items-center justify-center">
            <button onClick={() => setShowAddContact(false)} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
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
              className="btn-primary"
              disabled={contactAddress === '' || contactNickname === ''}
              onClick={() => addContact()}>
              Add/Update
            </button>
          </div>
        </div>
      }

      <div className="mx-auto flex flex-col mt-4">
        <div className="card-title row-center-middle">
          {SettingPageTab.Contact}
          <AiOutlineUserAdd className="icon" onClick={() => setShowAddContact(true)} />
        </div>

        <div className="min-w-full p-2 flex gap-1 rounded-lg shadow-xl justify-center">
          <div className={`mt-1 flex-1`}>
            <div className='flex flex-col'>
              {
                ContactList.length > 0 ?
                  <div className={`table-container`}>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="">
                        <tr className="p-2 text-center font-bold text-sm text-gray-800 dark:text-gray-300 tracking-wider">
                          <th>Avatar</th>
                          <th>
                            <div className="flex flex-row justify-center items-center">
                              Follow
                              <AiOutlineQuestionCircle onClick={() => dispatch(setFlashNoticeMessage({ message: 'Turn on follow, you will cache all bulletins by this account', duration: 5000 }))
                              } />
                            </div>
                          </th>
                          <th>
                            <div className="flex flex-row justify-center items-center">
                              Friend
                              <AiOutlineQuestionCircle onClick={() => dispatch(setFlashNoticeMessage({ message: "Turn on firend, you are ready to chat with this account. The conversation can only begin with both side's consent.", duration: 5000 }))
                              } />
                            </div>
                          </th>
                          <th>Updated At</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {
                          ContactList.map((contact, index) => (
                            <tr key={index} className='border border-gray-200 dark:border-gray-700 hover:bg-gray-500'>
                              <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300"
                                title={contact.Address}>
                                <div className='mt-1 px-1 flex flex-col justify-center items-center'>
                                  <AvatarImage address={contact.Address} timestamp={Date.now()} style={'avatar'} />
                                  <AvatarName address={contact.Address} />
                                </div>
                              </td>
                              <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                                <ToggleSwitch isChecked={contact.IsFollow} onClick={() => { toggleIsFollow(contact.Address) }} />
                              </td>
                              <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                                <ToggleSwitch isChecked={contact.IsFriend} onClick={() => { toggleIsFriend(contact.Address) }} />
                              </td>
                              <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                                <TextTimestamp timestamp={contact.UpdatedAt} />
                              </td>
                              <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                                {
                                  contact.IsFollow === false && contact.IsFriend === false &&
                                  <button className="p-2 text-base font-bold bg-red-500 text-white rounded hover:bg-green-600"
                                    onClick={() => delContact(contact.Address)}>
                                    Delete
                                  </button>
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
                    no contact yet..
                  </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}