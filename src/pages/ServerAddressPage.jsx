import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AvatarImage from '../components/AvatarImage'
import AvatarName from '../components/AvatarName'
import PageList from '../components/PageList'
import { setBulletinAddress } from '../store/slices/MessengerSlice'

export default function ServerAddressPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const url = searchParams.get('url')

  const { Address } = useSelector(state => state.User)
  const { ServerAddressPage, ServerAddressTotalPage, ServerAddressList } = useSelector(state => state.Messenger)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    if (Address !== null) {
      dispatch({ type: 'RequestServerAddress', payload: { page: 1 } })
    }
  }, [dispatch, Address])

  const goto_address = (address) => {
    dispatch(setBulletinAddress(address))
    navigate('/bulletin_address')
  }

  return (
    <div className="flex justify-center items-center">
      <div className="tab-page">
        <div className="mx-auto w-full flex flex-col mt-4">
          <div className="card-title">
            {url}
          </div>

          {
            ServerAddressTotalPage > 1 &&
            <PageList current_page={ServerAddressPage} total_page={ServerAddressTotalPage} dispatch_type={'RequestServerAddress'} payload={{}} />
          }
          <div className="min-w-full p-2 flex gap-1 rounded-lg shadow-xl justify-center">
            <div className='flex flex-col'>
              {
                ServerAddressList.length > 0 ?
                  <div className={`table-container`}>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="">
                        <tr className="p-2 text-center font-bold text-sm text-gray-800 dark:text-gray-300 tracking-wider">
                          <th>Avatar</th>
                          <th>Bulletin Count</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {
                          ServerAddressList.map((account, index) => (
                            <tr key={index} className='border border-gray-200 dark:border-gray-700 hover:bg-gray-500'>
                              <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300"
                                title={account.Address}>
                                <div className='mt-1 px-1 flex flex-col justify-center items-center' onClick={() => goto_address(account.Address)}>
                                  <AvatarImage address={account.Address} timestamp={Date.now()} style={'avatar'} />
                                  <AvatarName address={account.Address} />
                                </div>
                              </td>
                              <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">
                                {account.Count}
                              </td>
                              <td className="p-2 whitespace-nowrap text-base text-gray-800 dark:text-gray-300">

                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                  :
                  <div className="mx-auto rounded-full p-1 border-2 border-gray-200 dark:border-gray-700 px-4">
                    <h3 className='text-2xl text-gray-500 dark:text-gray-200'>
                      no address yet...
                    </h3>
                  </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}