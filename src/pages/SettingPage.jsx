import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { SettingPageTab } from '../lib/AppConst'
import TabMe from './setting/TabMe'
import TabContact from './setting/TabContact'
import TabMessengerNetwork from './setting/TabMessengerNetwork'
import { setActiveTabSetting } from '../store/slices/UserSlice'
import TabChannel from './setting/TabChannel'
import TabGroup from './setting/TabGroup'

export default function SettingPage() {
  const tabItems = [
    { name: SettingPageTab.Me, content: <TabMe /> },
    { name: SettingPageTab.Contact, content: <TabContact /> },
    { name: SettingPageTab.Group, content: <TabGroup /> },
    { name: SettingPageTab.Channel, content: <TabChannel /> },
    { name: SettingPageTab.MessengerNetwork, content: <TabMessengerNetwork /> },
  ]

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { activeTabSetting } = useSelector(state => state.User)

  return (
    <div className="p-1 mt-8 flex justify-center items-center">
      <div className="w-full overflow-y-auto transition-width duration-300 ease-in-out"
      >
        <div className="flex border-b border-gray-700 dark:border-gray-200">
          {tabItems.map((item, index) => (
            <button
              key={index}
              onClick={() => dispatch(setActiveTabSetting(item.name))}
              className={`px-6 py-3 ${activeTabSetting === item.name ?
                'tab-title-active'
                :
                'tab-title'
                }`}
            >
              {item.name}
            </button>
          ))}
        </div>
        <div className="p-4">
          <div>
            {
              tabItems.map((item, index) => (
                <div
                  key={index}
                  className={`${activeTabSetting === item.name ? 'block' : 'hidden'}`}
                >
                  {item.content}
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}