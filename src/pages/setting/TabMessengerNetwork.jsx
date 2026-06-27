import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createSearchParams, useNavigate } from 'react-router-dom'
import { ConfirmContentOptions, SettingPageTab } from '../../lib/AppConst'
import TextInput from '../../components/Form/TextInput'
import { IoCloseOutline } from "react-icons/io5"
import { TbCloudNetwork } from "react-icons/tb"
import ToggleSwitch from '../../components/ToggleSwitch'
import { HiOutlineStatusOnline, HiOutlineStatusOffline } from "react-icons/hi"
import { IoStatsChartOutline } from "react-icons/io5"
import { setConfirmPopup } from '../../store/slices/CommonSlice'

export default function TabMessengerNetwork() {
  const [newURL, setNewURL] = useState('')
  const [showAddServer, setShowAddServer] = useState(false)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const { activeTabSetting } = useSelector(state => state.User)
  const { ServerList, ConnsStatus } = useSelector(state => state.Messenger)

  useEffect(() => {
    if (activeTabSetting === SettingPageTab.MessengerNetwork) {
    }
  }, [dispatch, activeTabSetting])

  const addServer = async () => {
    dispatch({
      type: 'ServerAdd',
      payload: {
        url: newURL
      }
    })
    setNewURL('')
    setShowAddServer(false)
  }

  const toggleIsConnect = async (url, is_connect) => {
    dispatch({
      type: 'ServerToggle',
      payload: {
        url: url,
        is_connect: is_connect
      }
    })
  }

  const { ConfirmPopup } = useSelector(state => state.Common)
  useEffect(() => {
    if (ConfirmPopup !== null && ConfirmPopup.Content === ConfirmContentOptions.DelServer && ConfirmPopup.Result) {
      dispatch({
        type: 'ServerDel',
        payload: { url: ConfirmPopup.Params.URL }
      })
      dispatch(setConfirmPopup(null))
    }
  }, [ConfirmPopup])

  const confirmDelServer = (url) => {
    dispatch(setConfirmPopup({ Content: ConfirmContentOptions.DelServer, Result: false, Params: { URL: url } }))
  }

  const setDefaultServer = async (url) => {
    dispatch({
      type: 'ServerSetDefault',
      payload: {
        url: url
      }
    })
  }

  const goto_server = async (url) => {
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
        <div className={`modal-overlay`}>
          <div className="max-w-md w-full mx-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20 dark:border-primary/30 rounded-t-xl bg-gradient-card dark:bg-dark-gradient-card shadow-lg">
              <span className={`label text-base`}>Add Server</span>
              <button onClick={() => setShowAddServer(false)} className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors">
                <IoCloseOutline className="text-lg text-text-secondary dark:text-dark-text-secondary" />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col overflow-y-auto px-4 py-3 bg-gradient-card dark:bg-dark-gradient-card grow gap-3">
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
          <TbCloudNetwork className="card-icon" onClick={() => setShowAddServer(true)} />
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
                        <ToggleSwitch isChecked={server.is_connect} onClick={() => toggleIsConnect(server.url, !server.is_connect)} />
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
                          <IoStatsChartOutline onClick={() => goto_server(server.url)} className="cursor-pointer tool-icon" />
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
              <TbCloudNetwork className="text-4xl text-primary/30 dark:text-dark-primary/30 mb-2" />
              <h3 className='text-lg font-medium text-text-secondary dark:text-dark-text-secondary'>No servers yet</h3>
              <p className="text-sm text-text-secondary/60 dark:text-dark-text-secondary/60 mt-1">Add a server to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}       
