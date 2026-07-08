import { useSelector } from 'react-redux'
import { useSearchParams } from 'react-router-dom'
import { BsGlobe2 } from 'react-icons/bs'

import AvatarName from '../components/AvatarName'
import BulletinAvatarLink from '../components/Bulletin/BulletinAvatarLink'
import EmptyState from '../components/EmptyState'
import PageList from '../components/PageList'
import { useBulletinLoad } from '../hooks/useBulletinLoad'
import { selectServerAddressData } from '../selectors'

export default function ServerAddressPage() {
  const [searchParams] = useSearchParams()
  const url = searchParams.get('url')

  useBulletinLoad('RequestServerAddress')

  const { ServerAddressPage, ServerAddressTotalPage, ServerAddressList } = useSelector(selectServerAddressData)

  return (
    <div className="flex justify-center items-center">
      <div className="tab-page">
        <div className="mx-auto w-full flex flex-col mt-4">
          <div className="card-title">
            {url}
          </div>

          {ServerAddressTotalPage > 1 && (
            <PageList current_page={ServerAddressPage} total_page={ServerAddressTotalPage} dispatch_type={'RequestServerAddress'} payload={{}} />
          )}
          <div className="min-w-full p-4 rounded-xl card">
            {ServerAddressList.length > 0 ? (
              <div className={`table-container`}>
                <table className="min-w-full divide-y divide-primary/10 dark:divide-primary/20">
                  <thead>
                    <tr className="text-center font-bold text-sm text-primary dark:text-dark-primary tracking-wider">
                      <th>Avatar</th>
                      <th>Bulletin Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary/10 dark:divide-primary/20">
                    {ServerAddressList.map((account) => (
                      <tr key={account.Address} className='table-tr'>
                        <td className="p-3 whitespace-nowrap text-base text-text-primary dark:text-dark-text-primary" title={account.Address}>
                          <div className='flex flex-col justify-center items-center gap-1'>
                            <BulletinAvatarLink address={account.Address} classNames={'avatar'} />
                            <AvatarName address={account.Address} />
                          </div>
                        </td>
                        <td className="p-3 text-base text-text-primary dark:text-dark-text-primary">
                          {account.Count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={<BsGlobe2 className="text-5xl text-primary/30 dark:text-dark-primary/30 mb-3" />}
                title="No addresses yet"
                description="Server-discovered bulletin authors will appear here"
              />
            )}
          </div>
          {ServerAddressTotalPage > 1 && (
            <PageList current_page={ServerAddressPage} total_page={ServerAddressTotalPage} dispatch_type={'RequestServerAddress'} payload={{}} />
          )}
        </div>
      </div>
    </div>
  )
}