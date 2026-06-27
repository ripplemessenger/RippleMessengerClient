import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { decryptWithPassword, encryptWithPassword, genSalt, getWallet } from '../lib/AppUtil'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { loadAccountListStart, loginStart } from '../store/slices/UserSlice'
import SelectInput from '../components/Form/SelectInput'
import TextInput from '../components/Form/TextInput'
import FormButton from '../components/Form/FormButton'
import { AiOutlineUserAdd } from 'react-icons/ai'
import { IoCloseOutline, IoCopyOutline } from 'react-icons/io5'
import { BsIncognito } from "react-icons/bs"
import { CgDice5 } from "react-icons/cg"
import { ECDSA, Wallet } from 'xrpl'
import AvatarSelector from '../components/AvatarSelector'

export default function OpenPage() {
  const [seed, setSeed] = useLocalStorage('Seed', '')
  const [address, setAddress] = useLocalStorage('Address', '')

  // add
  const [showAdd, setShowAdd] = useState(false)
  const [savePassword, setSavePassword] = useState('')
  const [saveSeed, setSaveSeed] = useState('')
  const [saveAddress, setSaveAddress] = useState('')
  const [addError, setAddError] = useState(null)

  const updateSeed = (value) => {
    value = value.trim()
    setSaveSeed(value)
    setSaveAddress('')
    setAddError(null)

    if (value !== '') {
      try {
        let wallet = getWallet(value)
        setSaveAddress(wallet.classicAddress)
      } catch (error) {
        console.log(error)
        setAddError(error.message)
      }
    }
  }

  const addAccount = async () => {
    const salt = genSalt()
    let cipherData = encryptWithPassword(saveSeed, savePassword, salt)
    dispatch({ type: 'AccountAdd', payload: { address: saveAddress, salt: salt, cipher_data: cipherData } })
    setSavePassword('')
    setSaveSeed('')
    if (addError === null && saveSeed !== '') {
      setSeed(saveSeed)
      setAddress(saveAddress)
      dispatch(loginStart({ seed: saveSeed, address: saveAddress }))
    }
  }

  // tmp
  const [showTmp, setShowTmp] = useState(false)
  const [diplaySeed, setDisplaySeed] = useState('')
  const [tmpError, setTmpError] = useState(null)

  const tmpUpdateSeed = (value) => {
    value = value.trim()
    setDisplaySeed(value)
    setAddress('')
    setTmpError(null)

    if (value !== '') {
      try {
        let wallet = getWallet(value)
        setSeed(value)
        setAddress(wallet.classicAddress)
        dispatch(loginStart({ seed: value, address: wallet.classicAddress }))
      } catch (error) {
        console.log(error)
        setSeed('')
        setTmpError(error.message)
      }
    } else {
      setSeed('')
    }
  }

  useEffect(() => {
    if (diplaySeed === '') {
      setTmpError(null)
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
  const [avatarIndex, setAvatarIndex] = useState(0)
  const [loginError, setLoginError] = useState(null)

  const focusPasswordInput = () => {
    setTimeout(() => document.getElementById('input-password:')?.focus(), 0)
  }

  const [copiedField, setCopiedField] = useState(null)

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(label)
      setTimeout(() => setCopiedField(null), 1500)
    })
  }

  // Global keyboard: Left/Right switch avatar, Down focus password, Escape close modals
  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        setShowAdd(false)
        setShowTmp(false)
        setShowGen(false)
        return
      }
      // Left/Right/Down only work when no modal is open
      if (showAdd || showTmp || showGen) return
      if (addressOptions.length <= 1) return

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const newIndex = e.key === 'ArrowLeft'
          ? (avatarIndex - 1 + addressOptions.length) % addressOptions.length
          : (avatarIndex + 1) % addressOptions.length
        setAvatarIndex(newIndex)
        setAddressSelectd(addressOptions[newIndex].value)
        focusPasswordInput()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        focusPasswordInput()
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [avatarIndex, addressOptions, showAdd, showTmp, showGen])

  // Auto-focus first input when modals open
  useEffect(() => {
    if (showAdd) document.getElementById('input-your-seed:')?.focus()
  }, [showAdd])

  useEffect(() => {
    if (showTmp) document.getElementById('input-your-seed:')?.focus()
  }, [showTmp])

  const { IsAuth, AccountList, Seed } = useSelector(state => state.User)

  const navigate = useNavigate()
  const dispatch = useDispatch()

  const login = async () => {
    let account = AccountList?.find(a => a.address === addressSelectd)
    try {
      let tmpSeed = decryptWithPassword(openPassword, account.salt, account.cipher_data)
      if (tmpSeed !== '') {
        setLoginError(null)
        setSeed(tmpSeed)
        setAddress(addressSelectd)
        dispatch(loginStart({ seed: tmpSeed, address: addressSelectd }))
      } else {
        setLoginError('wrong password')
      }
    } catch (e) {
      console.log(e)
      setLoginError(typeof e === 'string' ? e : String(e))
    }
  }

  useEffect(() => {
    let options = []
    for (let i = 0; i < AccountList.length; i++) {
      const account = AccountList[i];
      options.push({ value: account.address, label: account.address })
    }
    setAddressOptions(options)
    if (options.length > 0) {
      setAddressSelectd(options[0].value)
      focusPasswordInput()
    }
  }, [AccountList])

  useEffect(() => {
    dispatch({ type: loadAccountListStart.type })
  }, [])

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
        <div className={`modal-overlay`}>
          <div className="modal-action-row">
            <button onClick={() => setShowGen(false)} className="modal-btn-gray">
              <IoCloseOutline className='icon' /> cancel
            </button>
          </div>
          <div className="space-y-4 flex flex-col justify-center mt-1">
            <div className="card-title flex flex-row items-center">
              Generate
            </div>
            <div className="flex flex-col justify-center">
              <FormButton title="Generate Account" onClick={genNewAccount} />
              <div className={`mt-2 ${newSeed === '' ? 'hidden' : ''}`}>
                <div className="justify-center flex flex-col">
                  <label className="label flex items-center gap-1">
                    Seed:
                    <span className="text-xs font-normal text-text-secondary dark:text-dark-text-secondary">(click to copy)</span>
                  </label>
                  <div onClick={() => copyToClipboard(newSeed, 'seed')}
                    className="w-full px-3 py-2 border rounded-lg shadow-sm cursor-pointer break-all select-all border-primary/30 dark:border-primary/40 input-color hover:border-status-success/60 dark:hover:border-status-success-dark/60 hover:bg-primary/5 dark:hover:bg-dark-primary/5 transition-all group relative">
                    {newSeed}
                    <IoCopyOutline className={`absolute top-2 right-2 opacity-0 group-hover:opacity-60 transition-opacity ${copiedField === 'seed' ? 'text-status-success dark:text-status-success-dark opacity-100' : 'text-text-secondary dark:text-dark-text-secondary'}`} />
                  </div>
                  {copiedField === 'seed' && <span className="text-xs mt-1 text-status-success dark:text-status-success-dark font-medium">✓ Copied to clipboard!</span>}
                </div>
              </div>
              <div className={`mt-2 ${newAddress === '' ? 'hidden' : ''}`}>
                <div className="justify-center flex flex-col">
                  <label className="label flex items-center gap-1">
                    Address:
                    <span className="text-xs font-normal text-text-secondary dark:text-dark-text-secondary">(click to copy)</span>
                  </label>
                  <div onClick={() => copyToClipboard(newAddress, 'address')}
                    className="w-full px-3 py-2 border rounded-lg shadow-sm cursor-pointer break-all select-all border-primary/30 dark:border-primary/40 input-color hover:border-status-success/60 dark:hover:border-status-success-dark/60 hover:bg-primary/5 dark:hover:bg-dark-primary/5 transition-all group relative">
                    {newAddress}
                    <IoCopyOutline className={`absolute top-2 right-2 opacity-0 group-hover:opacity-60 transition-opacity ${copiedField === 'address' ? 'text-status-success dark:text-status-success-dark opacity-100' : 'text-text-secondary dark:text-dark-text-secondary'}`} />
                  </div>
                  {copiedField === 'address' && <span className="text-xs mt-1 text-status-success dark:text-status-success-dark font-medium">✓ Copied to clipboard!</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      {
        showTmp &&
        <div className={`modal-overlay`}>
          <div className="modal-action-row">
            <button onClick={() => setShowTmp(false)} className="modal-btn-gray">
              <IoCloseOutline className='icon' /> cancel
            </button>
          </div>
          <div className="space-y-4 flex flex-col justify-center mt-1">
            <div className="card-title flex flex-row items-center">
              Tmp Open
            </div>
            {
              Seed === null &&
              <div className="form-card-container mb-6">
                <div className="space-y-4 flex flex-col justify-center">
                  <div className={`mt-1`}>
                    <TextInput label={'Your Seed:'} type='password' value={diplaySeed} autoComplete={"off"} placeholder={"s.................................."} onChange={(e) => tmpUpdateSeed(e.target.value)} />
                  </div>
                </div>
              </div>
            }
            {tmpError !== null && (
              <div className="p-3 rounded-xl border border-status-error/30 dark:border-status-error-dark/40 bg-status-error/5 dark:bg-status-error-dark/20 max-w-md mx-auto mb-4">
                <span className='text-sm font-medium block w-full break-words text-status-error dark:text-status-error-dark'>{tmpError}</span>
              </div>
            )}
          </div>
        </div>
      }

      {
        showAdd &&
        <div className={`modal-overlay`}>
          <div className="modal-action-row">
            <button onClick={() => setShowAdd(false)} className="modal-btn-gray">
              <IoCloseOutline className='icon' /> cancel
            </button>
          </div>
          <div className="space-y-4 flex flex-col justify-center mt-1">
            <div className="card-title flex flex-row items-center">
              Add Account
            </div>
            <div className={`mt-1`}>
              <TextInput label={'Your Seed:'} type='password' value={saveSeed} autoComplete={"off"} placeholder={"s.................................."} onChange={(e) => updateSeed(e.target.value)} />
            </div>
            <div className={`mt-1 ${saveSeed === '' ? 'hidden' : ''}`}>
              <TextInput label={'Address:'} value={saveAddress} disabled={true} autoComplete={"off"} placeholder={"r.................................."} />
            </div>
            {addError !== null && (
              <div className="p-3 rounded-xl border border-status-error/30 dark:border-status-error-dark/40 bg-status-error/5 dark:bg-status-error-dark/20">
                <span className='text-sm font-medium text-status-error dark:text-status-error-dark break-all'>{addError}</span>
              </div>
            )}
            <div className={`mt-1`}>
              <TextInput label={'Password:'} type='password' value={savePassword} autoComplete={"off"} placeholder={"........"} onChange={(e) => setSavePassword(e.target.value)} />
            </div>
            <FormButton title="Add Account" onClick={addAccount} disabled={saveSeed === '' || savePassword.trim() === ''} />
          </div>
        </div>
      }

      <div className="overflow-y-auto text-text-primary dark:text-dark-text-primary transition-width duration-300 ease-in-out"
      >
        <div className="tab-page">
          <div className="card-title flex flex-row items-center">
            Open Account
            <AiOutlineUserAdd className="card-icon" onClick={() => setShowAdd(true)} />
            <BsIncognito className="card-icon" onClick={() => setShowTmp(true)} />
            <CgDice5 className="card-icon" onClick={() => setShowGen(true)} />
          </div>
          {
            addressSelectd !== '' ?
              <div className="!max-w-sm max-w-full w-full mx-auto mb-10">
                <div className="form-card-container">
                <div className="flex flex-col justify-center p-6 space-y-4">
                  <AvatarSelector avatars={addressOptions} defaultIndex={avatarIndex} disableKeyboard={true} onSelect={(address) => {
                    let index = addressOptions.map(a => a.value).indexOf(address)
                    setAvatarIndex(index)
                    setAddressSelectd(address)
                    focusPasswordInput()
                  }} />
                  <div className={`mt-1`}>
                    <SelectInput label={'Address:'} options={addressOptions} selectdOption={addressSelectd} onChange={(e) => {
                      setAddressSelectd(e.target.value)
                      let index = addressOptions.map(a => a.value).indexOf(e.target.value)
                      setAvatarIndex(index)
                      focusPasswordInput()
                    }} />
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); login() }} className="flex flex-col">
                    <div className={`mt-1`}>
                      <TextInput label={'Password:'} type='password' value={openPassword} autoComplete={"off"} placeholder={"........"} onChange={(e) => setOpenPassword(e.target.value)} />
                    </div>
                    <FormButton title="Open Account" />
                  </form>
                </div>
              </div>
              </div>
              :
              <div className="empty-state-box my-4">
                <p className="text-text-secondary dark:text-dark-text-secondary">No saved accounts</p>
              </div>
          }
          {loginError !== null && (
            <div className="p-4 rounded-xl border border-status-error/30 dark:border-status-error-dark/40 bg-status-error/5 dark:bg-status-error-dark/20 mb-4 max-w-md mx-auto">
              <span className='text-sm font-medium text-status-error dark:text-status-error-dark break-all'>{loginError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}