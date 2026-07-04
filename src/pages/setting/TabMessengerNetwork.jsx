import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createSearchParams, useNavigate } from 'react-router-dom'
import { HiOutlineStatusOffline, HiOutlineStatusOnline } from 'react-icons/hi'
import { IoCloseOutline, IoStatsChartOutline } from 'react-icons/io5'
import { TbCloudNetwork } from 'react-icons/tb'

import TextInput from '../../components/Form/TextInput'
import ToggleSwitch from '../../components/ToggleSwitch'
import { useConfirmPopup } from '../../hooks/useConfirmPopup'
import { selectServerNetworkData } from '../../selectors'
import { ConfirmContentOptions, SettingPageTab } from '../../lib/AppConst'
import { ServerAdd, ServerDel, ServerSetDefault, ServerToggle } from '../../store/sagas/messenger.actions'
import { setConfirmPopup } from '../../store/slices/CommonSlice'

export default function TabMessengerNetwork() {
  const [newURL, setNewURL] = useState('')
  const [showAddServer, setShowAddServer] = useState(false)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const { ServerList, ConnsStatus } = useSelector(selectServerNetworkData)

  const addServer = () => {
    dispatch(ServerAdd({
      url: newURL
    }))
    setNewURL('')
    setShowAddServer(false)
  }

  const toggleIsConnect = (url, is_connect) => {
    dispatch(ServerToggle({
      url: url,
      is_connect: is_connect
    }))
  }

  const ConfirmPopup = useConfirmPopup()
  useEffect(() => {
    if (ConfirmPopup?.Content === ConfirmContentOptions.DelServer && ConfirmPopup?.Result) {
      dispatch(ServerDel({ url: ConfirmPopup?.Params?.URL }))
      dispatch(setConfirmPopup(null))
    }
  }, [ConfirmPopup])

  const confirmDelServer = (url) => {
    dispatch(setConfirmPopup({ Content: ConfirmContentOptions.DelServer, Result: false, Params: { URL: url } }))
  }

  const setDefaultServer = (url) => {
    dispatch(ServerSetDefault({
      url: url
    }))
  }

  const goto_server = (url) => {
    const params = { url: url }
    navigate({
      pathname: '/server_address',
      search: `?${createSearchParams(params)}`
    })
  }

  return (
    <div className="tab-page">
      {
        showAddServer &&
        <div className={`modal-overlay`} role="dialog" aria-modal="true">
          <div className="max-w-md w-full mx-4 flex flex-col">
            {/* Header */}
            <div className="modal-header-bar">
              <span className={`label text-base`}>Add Server</span>
              <button onClick={() => setShowAddServer(false)} className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors" aria-label="Close">
                <IoCloseOutline className="text-lg text-text-secondary dark:text-dark-text-secondary" />
              </button>
            </div>

            {/* Content */}
            <div className="modal-content-area gap-3">
              <TextInput label={'URL:'} value={newURL} onChange={(e) => setNewURL(e.target.value.trim())} />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-primary/20 dark:border-primary/30 rounded-b-xl bg-surface dark:bg-dark-surface shadow-lg">
              <button onClick={() => setShowAddServer(false)} className="btn-sm hover:bg-primary/10 dark:hover:bg-primary/20 text-text-secondary dark:text-dark-text-secondary border border-primary/20 dark:border-primary/30">
                Cancel
              </button>
              <button
                className="btn-sm btn-gold"
                disabled={newURL === ''}
                onClick={() => addServer()}>
                Add
              </button>
            </div>
          </div>
        </div>
      }

      <div className="mx-auto flex flex-col mt-4">
        <div className="card-title flex flex-row items-center">
          {SettingPageTab.MessengerNetwork}
          <button className="icon-action-btn" onClick={() => setShowAddServer(true)} aria-label="Add server">
            <TbCloudNetwork className="card-icon" />
          </button>
        </div>

        <div className="min-w-full rounded-xl card">
          {ServerList.length > 0 ? (
            <div className={`table-container`}>
              <table className="min-w-full divide-y divide-primary/10 dark:divide-primary/20">
                <thead>
                  <tr className="text-center font-bold text-sm text-primary dark:text-dark-primary tracking-wider">
                    <th>URL</th>
                    <th>Connect</th>
                    <th>Status</th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10 dark:divide-primary/20">
                  {ServerList.map((server) => (
                    <tr key={server.url} className='table-tr'>
                      <td className="table-cell font-mono text-sm">
                        {server.url}
                      </td>
                      <td className="table-cell">
                        <ToggleSwitch isChecked={server.is_connect} onClick={() => toggleIsConnect(server.url, !server.is_connect)} ariaLabel={`Connect ${server.url}`} />
                      </td>
                      <td className="table-cell">
                        {ConnsStatus[server.url] && ConnsStatus[server.url] === WebSocket.OPEN ? (
                          <HiOutlineStatusOnline className="icon text-status-success dark:text-status-success-dark" />
                        ) : (
                          <HiOutlineStatusOffline className="icon text-status-error dark:text-status-error-dark" />
                        )}
                      </td>
                      <td className="table-cell">
                        <button className="btn-sm btn-primary-outline"
                          onClick={() => setDefaultServer(server.url)}>
                          Set Default
                        </button>
                      </td>
                      <td className="table-cell">
                        {server.is_connect && (
                          <button className="icon-action-btn" onClick={() => goto_server(server.url)} aria-label="View server statistics">
                            <IoStatsChartOutline className="icon-sm" />
                          </button>
                        )}
                      </td>
                      <td className="table-cell">
                        {!server.is_connect && (
                          <button className="btn-sm btn-danger"
                            onClick={() => confirmDelServer(server.url)}>
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
            <div className="empty-state-box py-8">
              <TbCloudNetwork className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />
              <h3 className='text-lg font-medium text-text-secondary dark:text-dark-text-secondary'>No servers yet</h3>
              <p className="text-sm text-text-secondary/60 dark:text-dark-text-secondary/60 mt-1">Add a server to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}       
