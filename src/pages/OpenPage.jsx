import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { decryptWithPassword, encryptWithPassword, genSalt, getWallet } from '../lib/AppUtil'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { loadAccountListStart, loginStart, setUserError } from '../store/slices/UserSlice'
import SelectInput from '../components/Form/SelectInput'
import TextInput from '../components/Form/TextInput'
import { AiOutlineUserAdd } from 'react-icons/ai'
import { IoCloseOutline } from 'react-icons/io5'
import { BsIncognito } from "react-icons/bs"
import { CgDice5 } from "react-icons/cg"
import { ECDSA, Wallet } from 'xrpl'

export default function OpenPage() {
  const [seed, setSeed] = useLocalStorage('Seed', '')
  const [address, setAddress] = useLocalStorage('Address', '')

  // add
  const [showAdd, setShowAdd] = useState(false)
  const [savePassword, setSavePassword] = useState('')
  const [saveSeed, setSaveSeed] = useState('')
  const [saveAddress, setSaveAddress] = useState('')

  const updateSeed = (value) => {
    value = value.trim()
    setSaveSeed(value)
    setSaveAddress('')
    dispatch(setUserError(null))

    if (value !== '') {
      try {
        let wallet = getWallet(value)
        setSaveAddress(wallet.classicAddress)
      } catch (error) {
        console.log(error)
        dispatch(setUserError(error.message))
      }
    }
  }

  const addAccount = async () => {
    const salt = genSalt()
    let cipherData = encryptWithPassword(saveSeed, savePassword, salt)
    dispatch({ type: 'AccountAdd', payload: { address: saveAddress, salt: salt, cipher_data: cipherData } })
    setSavePassword('')
    setSaveSeed('')
    if (UserError === null && saveSeed !== '') {
      setSeed(saveSeed)
      setAddress(saveAddress)
      dispatch(loginStart({ seed: saveSeed, address: saveAddress }))
    }
  }

  // tmp
  const [showTmp, setShowTmp] = useState(false)
  const [diplaySeed, setDisplaySeed] = useState('')

  const tmpUpdateSeed = (value) => {
    value = value.trim()
    setDisplaySeed(value)
    setAddress('')
    dispatch(setUserError(null))

    if (value !== '') {
      try {
        let wallet = getWallet(value)
        setSeed(value)
        setAddress(wallet.classicAddress)
        dispatch(loginStart({ seed: value, address: wallet.classicAddress }))
      } catch (error) {
        console.log(error)
        setSeed('')
        dispatch(setUserError(error.message))
      }
    } else {
      setSeed('')
    }
  }

  useEffect(() => {
    if (diplaySeed === '') {
      dispatch(setUserError(null))
    }
  }, [diplaySeed])

  // gen
  const [showGen, setShowGen] = useState(false)
  const [newSeed, setNewSeed] = useState('')
  const [newAddress, setNewAddress] = useState('')

  const genNewAccount = async () => {
    const tmp = Wallet.generate(ECDSA.secp256k1)
    setNewSeed(tmp.seed)
    const wallet = getWallet(tmp.seed)
    setNewAddress(wallet.classicAddress)
  }

  // open save
  const [addressOptions, setAddressOptions] = useState([])
  const [addressSelectd, setAddressSelectd] = useState('')
  const [openPassword, setOpenPassword] = useState('')

  const { IsAuth, AccountList, UserError, Seed } = useSelector(state => state.User)

  const navigate = useNavigate()
  const dispatch = useDispatch()

  const login = async () => {
    let account = AccountList?.find(a => a.address === addressSelectd)
    try {
      let tmpSeed = decryptWithPassword(openPassword, account.salt, account.cipher_data)
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
    for (let i = 0; i < AccountList.length; i++) {
      const account = AccountList[i];
      options.push({ value: account.address, label: account.address })
    }
    setAddressOptions(options)
    if (options.length > 0) {
      setAddressSelectd(options[0].value)
    }
  }, [AccountList])

  useEffect(() => {
    dispatch({ type: loadAccountListStart.type })
  }, [])

  const delAccount = async () => {
    dispatch({ type: 'AccountDel', payload: { password: openPassword, address: addressSelectd } })
  }

  useEffect(() => {
    if (IsAuth) {
      navigate('/bulletin',
        {
          replace: true
        }
      )
    }
  }, [IsAuth])

  return (
    <div className="p-1 mt-8 flex justify-center items-center">
      {
        showGen &&
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-5 backdrop-blur-sm`}>
          <div className="flex flex-row items-center justify-center">
            <button onClick={() => setShowGen(false)} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
              <IoCloseOutline className='icon' /> cancel
            </button>
          </div>
          <div className="space-y-4 flex flex-col justify-center mt-1">
            <div className="card-title row-center-middle">
              Generate
            </div>
            <div className="flex flex-col justify-center">
              <button
                onClick={genNewAccount}
                className="btn-primary"
              >
                Generate Account
              </button>
              <div className={`mt-2 ${newSeed === '' ? 'hidden' : ''}`}>
                <TextInput label={'Seed:'} value={newSeed} disabled={true} />
              </div>
              <div className={`mt-2 ${newAddress === '' ? 'hidden' : ''}`}>
                <TextInput label={'Address:'} value={newAddress} disabled={true} />
              </div>
            </div>
          </div>
        </div>
      }

      {
        showTmp &&
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-5 backdrop-blur-sm`}>
          <div className="flex flex-row items-center justify-center">
            <button onClick={() => setShowTmp(false)} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
              <IoCloseOutline className='icon' /> cancel
            </button>
          </div>
          <div className="space-y-4 flex flex-col justify-center mt-1">
            <div className="card-title row-center-middle">
              Tmp Open
            </div>
            {
              Seed === null &&
              <div className="p-6 rounded-lg shadow-xl mb-10">
                <div className="space-y-4 flex flex-col justify-center">
                  <div className={`mt-1`}>
                    <TextInput label={'Your Seed:'} type='password' value={diplaySeed} autoComplete={"off"} placeholder={"s.................................."} onChange={(e) => tmpUpdateSeed(e.target.value)} />
                  </div>
                </div>
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
        </div>
      }

      {
        showAdd &&
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-5 backdrop-blur-sm`}>
          <div className="flex flex-row items-center justify-center">
            <button onClick={() => setShowAdd(false)} className="flex flex-col items-center justify-center p-2 rounded-lg text-gray-500 bg-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600">
              <IoCloseOutline className='icon' /> cancel
            </button>
          </div>
          <div className="space-y-4 flex flex-col justify-center mt-1">
            <div className="card-title row-center-middle">
              Add Account
            </div>
            <div className={`mt-1`}>
              <TextInput label={'Your Seed:'} type='password' value={saveSeed} autoComplete={"off"} placeholder={"s.................................."} onChange={(e) => updateSeed(e.target.value)} />
            </div>
            <div className={`mt-1 ${saveSeed === '' ? 'hidden' : ''}`}>
              <TextInput label={'Address:'} value={saveAddress} disabled={true} autoComplete={"off"} placeholder={"r.................................."} />
            </div>
            <div className={`mt-1`}>
              <TextInput label={'Password:'} type='password' value={savePassword} autoComplete={"off"} placeholder={"........"} onChange={(e) => setSavePassword(e.target.value)} />
            </div>
            <button
              onClick={addAccount}
              disabled={saveSeed === '' || savePassword.trim() === ''}
              className="btn-primary"
            >
              Add Account
            </button>
          </div>
        </div>
      }

      <div className="w-full overflow-y-auto text-gray-800 dark:text-gray-200 transition-width duration-300 ease-in-out"
      >
        <div className="tab-page">
          <div className="card-title row-center-middle">
            Open Account
            <AiOutlineUserAdd className="card-icon" onClick={() => setShowAdd(true)} />
            <BsIncognito className="card-icon" onClick={() => setShowTmp(true)} />
            <CgDice5 className="card-icon" onClick={() => setShowGen(true)} />
          </div>
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
      </div>
    </div>
  )
}