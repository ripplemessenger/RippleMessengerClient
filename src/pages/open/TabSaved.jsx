import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { loadLocalAccountListStart, loginStart, setUserError } from '../../store/slices/UserSlice'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import TextInput from '../../components/Form/TextInput'
import SelectInput from '../../components/Form/SelectInput'
import { OpenPageTab } from '../../lib/AppConst'
import { decryptWithPassword } from '../../lib/AppUtil'

export default function TabSaved() {
  const [seed, setSeed] = useLocalStorage('Seed', '')
  const [address, setAddress] = useLocalStorage('Address', '')

  const [addressOptions, setAddressOptions] = useState([])
  const [addressSelectd, setAddressSelectd] = useState('')
  const [openPassword, setOpenPassword] = useState('')

  const { activeTabOpen, LocalAccountList, UserError } = useSelector(state => state.User)

  const navigate = useNavigate()
  const dispatch = useDispatch()

  const login = async () => {
    let account = LocalAccountList?.find(a => a.Address === addressSelectd)
    try {
      let tmpSeed = decryptWithPassword(openPassword, account.Salt, account.CipherData)
      if (tmpSeed !== '') {
        setSeed(tmpSeed)
        setAddress(addressSelectd)
        dispatch(loginStart({ seed: tmpSeed, address: addressSelectd }))
      }
    } catch (e) {
      console.log(e)
      setUserError(e)
    }
  }

  useEffect(() => {
    setAddressSelectd('')
    let options = []
    for (let i = 0; i < LocalAccountList.length; i++) {
      const account = LocalAccountList[i];
      options.push({ value: account.Address, label: account.Address })
    }
    setAddressOptions(options)
    if (options.length > 0) {
      setAddressSelectd(options[0].value)
    }
  }, [LocalAccountList])

  useEffect(() => {
    if (activeTabOpen === OpenPageTab.Saved) {
      dispatch({ type: loadLocalAccountListStart.type })
    }
  }, [activeTabOpen])

  const delAccount = async () => {
    dispatch({ type: 'LocalAccountDel', payload: { password: openPassword, address: addressSelectd } })
  }

  return (
    <div className="tab-page">
      {
        addressSelectd !== '' ?
          <div className="p-6 rounded-lg shadow-xl mb-10">
            <div className="space-y-4 flex flex-col justify-center">
              <div className={`mt-1`}>
                <SelectInput label={'Address:'} options={addressOptions} selectdOption={addressSelectd} onChange={(e) => setAddressSelectd(e.target.value)} />
              </div>
              <div className={`mt-1`}>
                <TextInput label={'Password:'} type='password' value={openPassword} autoComplete={"off"} placeholder={"........"} onChange={(e) => setOpenPassword(e.target.value)} />
              </div>
              <button
                onClick={login}
                className={`btn-primary`}
              >
                Open Account
              </button>
              <button
                onClick={delAccount}
                className={`w-96 py-2 text-3xl font-bold bg-yellow-500 text-white rounded hover:bg-yellow-600`}
              >
                Remove Account
              </button>
            </div>
          </div>
          :
          <div>
            no saved account
          </div>
      }
      {
        UserError !== null &&
        <div className="p-6 rounded-lg shadow-xl w-96 mb-5">
          <span className='text-3xl font-bold inline-block w-full break-words text-red-800 dark:text-red-200'>
            {UserError}
          </span>
        </div>
      }
    </div>
  )
}