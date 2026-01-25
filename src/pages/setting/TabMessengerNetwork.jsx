import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { SettingPageTab } from '../../lib/AppConst'
import TextInput from '../../components/Form/TextInput'
import { IoCloseOutline } from "react-icons/io5"
import { TbCloudNetwork } from "react-icons/tb"

export default function TabMessengerNetwork() {
  const [newURL, setNewURL] = useState('')
  const [showAddServer, setShowAddServer] = useState(false)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const { activeTabSetting } = useSelector(state => state.User)
  const { ServerList, CurrentServer } = useSelector(state => state.Messenger)

  useEffect(() => {
    console.log(ServerList)
    console.log(CurrentServer)
    if (activeTabSetting === SettingPageTab.Contact) {
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

  const useServer = async (url) => {
    dispatch({
      type: 'ServerUse',
      payload: {
        url: url
      }
    })
  }

  const delServer = async (url) => {
    dispatch({
      type: 'ServerDel',
      payload: {
        url: url
      }
    })
  }

  return (
    <div className="tab-page">
      {
        showAddServer &&
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-5 backdrop-blur-sm`}>
          <div className="flex flex-row items-center justify-center">
            <button onClick={() => setShowAddServer(false)} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
              <IoCloseOutline className='icon' /> cancel
            </button>
          </div>
          <div className="mx-auto flex flex-col mt-4">
            <div className="card-title">
              Add Server
            </div>
            <TextInput label={'URL:'} value={newURL} onChange={(e) => setNewURL(e.target.value.trim())} />
            <button
              className="btn-primary"
              disabled={newURL === ''}
              onClick={() => addServer()}>
              Add
            </button>
          </div>
        </div>
      }

      <div className="mx-auto flex flex-col mt-4">
        <div className="card-title row-center-middle">
          {SettingPageTab.MessengerNetwork}
          <TbCloudNetwork className="icon" onClick={() => setShowAddServer(true)} />
        </div>

        <div className="min-w-full p-2 flex gap-1 rounded-lg shadow-xl justify-center">
          <div className={`mt-1 flex-1`}>
            <div className='flex flex-col'>
              <div className={`table-container`}>
                {
                  ServerList.length > 0 &&
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="">
                      <tr className="p-2 text-center font-bold text-sm text-gray-800 dark:text-gray-300 tracking-wider">
                        <th>URL</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {
                        ServerList.map((server, index) => (
                          <tr key={index} className='border border-gray-200 dark:border-gray-700 hover:bg-gray-500'>
                            <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300"                            >
                              {server.URL}
                            </td>

                            <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                              {
                                server.URL !== CurrentServer &&
                                <button className="p-2 text-base font-bold bg-green-500 text-white rounded hover:bg-green-600"
                                  onClick={() => useServer(server.URL)}>
                                  Use
                                </button>
                              }
                              <button className="p-2 text-base font-bold bg-red-500 text-white rounded hover:bg-green-600"
                                onClick={() => delServer(server.URL)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}       
