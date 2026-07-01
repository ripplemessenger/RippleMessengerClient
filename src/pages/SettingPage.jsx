import { lazy, Suspense, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import LoadingDiv from '../components/LoadingDiv'
import { SettingPageTab } from '../lib/AppConst'
import { setActiveTabSetting } from '../store/slices/UserSlice'

const TabContact = lazy(() => import('./setting/TabContact'))
const TabGroup = lazy(() => import('./setting/TabGroup'))
const TabMe = lazy(() => import('./setting/TabMe'))
const TabMessengerNetwork = lazy(() => import('./setting/TabMessengerNetwork'))

const tabContentMap = {
  [SettingPageTab.Me]: TabMe,
  [SettingPageTab.Contact]: TabContact,
  [SettingPageTab.Group]: TabGroup,
  [SettingPageTab.MessengerNetwork]: TabMessengerNetwork,
}

export default function SettingPage() {
  const dispatch = useDispatch()
  const { activeTabSetting } = useSelector(state => state.User)

  const tabItems = useMemo(() => Object.keys(tabContentMap), [])

  return (
    <div className="p-4 mt-2 w-full max-w-4xl mx-auto">
      <div className="rounded-xl card p-5">
        <div className="flex border-b border-primary/20 dark:border-primary/30 -mx-2 -mb-4">
          {tabItems.map((name) => (
            <button
              key={name}
              onClick={() => dispatch(setActiveTabSetting(name))}
              className={`px-5 py-3 text-sm font-medium transition-colors rounded-t-lg ${activeTabSetting === name ?
                'tab-title-active border-b-2 border-primary dark:border-dark-primary' :
                'tab-title hover:text-text-primary/80 dark:hover:text-dark-text-primary/80'
                }`}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tabItems.map((name) => {
            const TabComponent = tabContentMap[name]
            return (
              <div key={name} className={`${activeTabSetting === name ? 'block' : 'hidden'}`}>
                <Suspense fallback={<LoadingDiv isLoading={true} text="Loading..." />}>
                  <TabComponent />
                </Suspense>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}