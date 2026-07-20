import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { MdStorage } from 'react-icons/md'
import { SettingPageTab } from '../../lib/AppConst'
import { selectStorageSummary } from '../../selectors'
import { LoadStorageSummary } from '../../store/sagas/messenger.actions'
import StorageSummaryPanel from './StorageSummaryPanel'
import BulletinManagerPanel from './BulletinManagerPanel'
import FileManagerPanel from './FileManagerPanel'

const ManagerTab = { BULLETIN: 'bulletins', FILE: 'files' }

export default function TabStorage() {
  const dispatch = useDispatch()
  const storageSummary = useSelector(selectStorageSummary)
  const [managerTab, setManagerTab] = useState(ManagerTab.BULLETIN)

  useEffect(() => {
    dispatch(LoadStorageSummary())
  }, [dispatch])

  return (
    <div className="tab-page">
      <div className="mx-auto flex flex-col mt-4 w-full max-w-full min-w-0">
        <div className="card-title flex flex-row items-center">
          {SettingPageTab.Storage}
          <MdStorage className="card-icon" />
        </div>

        {/* Storage Summary */}
        <StorageSummaryPanel summary={storageSummary} />

        {/* Manager with tabs */}
        <div className="rounded-xl card p-6 mt-4 border">
          <div className="flex gap-2 mb-4 border-b border-primary/20 dark:border-primary/30 -mx-2 -mb-5 pb-2">
            <button
              onClick={() => setManagerTab(ManagerTab.BULLETIN)}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
                managerTab === ManagerTab.BULLETIN
                  ? 'tab-title-active border-b-2 border-primary dark:border-dark-primary'
                  : 'tab-title hover:text-text-primary/80 dark:hover:text-dark-text-primary/80'
              }`}
            >
              Bulletins
            </button>
            <button
              onClick={() => setManagerTab(ManagerTab.FILE)}
              className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
                managerTab === ManagerTab.FILE
                  ? 'tab-title-active border-b-2 border-primary dark:border-dark-primary'
                  : 'tab-title hover:text-text-primary/80 dark:hover:text-dark-text-primary/80'
              }`}
            >
              Bulletin Files
            </button>
          </div>

          {managerTab === ManagerTab.BULLETIN ? (
            <BulletinManagerPanel />
          ) : (
            <FileManagerPanel />
          )}
        </div>
      </div>
    </div>
  )
}
