import { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import TabContact from './setting/TabContact'
import TabGroup from './setting/TabGroup'
import TabMe from './setting/TabMe'
import TabMessengerNetwork from './setting/TabMessengerNetwork'
import { SettingPageTab } from '../lib/AppConst'
import { setActiveTabSetting } from '../store/slices/UserSlice'

export default function SettingPage() {
  const tabItems = useMemo(() => [
    { name: SettingPageTab.Me, content: <TabMe /> },
    { name: SettingPageTab.Contact, content: <TabContact /> },
    { name: SettingPageTab.Group, content: <TabGroup /> },
    { name: SettingPageTab.MessengerNetwork, content: <TabMessengerNetwork /> },
  ], [])

  const dispatch = useDispatch()
  const { activeTabSetting } = useSelector(state => state.User)

  return (
    <div className="p-4 mt-2 w-full max-w-4xl mx-auto">
      <div className="rounded-xl card p-5">
        <div className="flex border-b border-primary/20 dark:border-primary/30 -mx-2 -mb-4">
          {tabItems.map((item) => (
            <button
              key={item.name}
              onClick={() => dispatch(setActiveTabSetting(item.name))}
              className={`px-5 py-3 text-sm font-medium transition-colors rounded-t-lg ${activeTabSetting === item.name ?
                'tab-title-active border-b-2 border-primary dark:border-dark-primary' :
                'tab-title hover:text-text-primary/80 dark:hover:text-dark-text-primary/80'
                }`}
            >
              {item.name}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tabItems.map((item) => (
            <div key={item.name} className={`${activeTabSetting === item.name ? 'block' : 'hidden'}`}>
              {item.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}