import { useState, useEffect, useRef, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { AiOutlineUserAdd } from 'react-icons/ai'
import { BsIncognito } from 'react-icons/bs'
import { CgDice5 } from 'react-icons/cg'

import AvatarSelector from '../components/AvatarSelector'
import FormButton from '../components/Form/FormButton'
import SelectInput from '../components/Form/SelectInput'
import TextInput from '../components/Form/TextInput'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Logger from '../lib/Logger'
import { decryptWithPassword } from '../lib/AppUtil'
import { getWallet } from '../lib/RippleUtil'
import { loadAccountListStart, loginStart } from '../store/slices/UserSlice'
import { AccountAdd } from '../store/sagas/messenger.actions'

// Sub-components (modals)
import AddAccountModal from './AddAccountModal'
import TempLoginModal from './TempLoginModal'
import GenerateAccountModal from './GenerateAccountModal'

export default function OpenPage() {
  // --- Redux hooks ---
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { IsAuth, AccountList, Seed } = useSelector(state => state.User)

  // --- LocalStorage ---
  const [seed, setSeed] = useLocalStorage('Seed', '')
  const [address, setAddress] = useLocalStorage('Address', '')

  // --- Modal visibility toggles ---
  const [showAdd, setShowAdd] = useState(false)
  const [showTmp, setShowTmp] = useState(false)
  const [showGen, setShowGen] = useState(false)

  // --- Temp login state (owned here, passed down) ---
  const [displaySeed, setDisplaySeed] = useState('')
  const [tmpError, setTmpError] = useState(null)

  useEffect(() => {
    if (displaySeed === '') {
      setTmpError(null)
    }
  }, [displaySeed])

  const tmpUpdateSeed = (value) => {
    value = value.trim()
    setDisplaySeed(value)
    setAddress('')
    setTmpError(null)

    if (value !== '') {
      try {
        const wallet = getWallet(value)
        setSeed(value)
        setAddress(wallet.classicAddress)
        dispatch(loginStart({ seed: value, address: wallet.classicAddress }))
      } catch (error) {
        Logger.debug(error)
        setSeed('')
        setTmpError(error.message)
      }
    } else {
      setSeed('')
    }
  }

  // --- Add account callback ---
  const onAddAccount = ({ seed: acctSeed, address: acctAddr, salt, cipher_data }) => {
    dispatch(AccountAdd({ address: acctAddr, salt, cipher_data }))
    if (acctAddr !== '') {
      setSeed(acctSeed)
      setAddress(acctAddr)
      dispatch(loginStart({ seed: acctSeed, address: acctAddr }))
    }
  }

  // --- Main login form state ---
  const addressOptions = useMemo(() => {
    return AccountList.map(a => ({ value: a.address, label: a.address }))
  }, [AccountList])
  const [addressSelected, setSelectedAddress] = useState('')
  const [openPassword, setOpenPassword] = useState('')
  const [avatarIndex, setAvatarIndex] = useState(0)
  const [loginError, setLoginError] = useState(null)
  const [loginLoading, setLoginLoading] = useState(false)

  // Ref for focusing password input
  const passwordRef = useRef(null)

  const focusPasswordInput = () => {
    setTimeout(() => passwordRef.current?.focus(), 0)
  }

  // --- Keyboard shortcuts (Escape closes modals, Left/Right/Down navigate avatars) ---
  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        setShowAdd(false)
        setShowTmp(false)
        setShowGen(false)
        return
      }
      if (showAdd || showTmp || showGen) return
      if (addressOptions.length <= 1) return

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        const newIndex = e.key === 'ArrowLeft'
          ? (avatarIndex - 1 + addressOptions.length) % addressOptions.length
          : (avatarIndex + 1) % addressOptions.length
        setAvatarIndex(newIndex)
        setSelectedAddress(addressOptions[newIndex].value)
        focusPasswordInput()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        focusPasswordInput()
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [avatarIndex, addressOptions, showAdd, showTmp, showGen])

  // --- Login ---
  const login = () => {
    const account = AccountList?.find(a => a.address === addressSelected)
    if (!account) return
    setLoginLoading(true)
    setTimeout(() => {
      try {
        const tmpSeed = decryptWithPassword(openPassword, account.salt, account.cipher_data)
        if (tmpSeed !== '') {
          setLoginError(null)
          setSeed(tmpSeed)
          setAddress(addressSelected)
          dispatch(loginStart({ seed: tmpSeed, address: addressSelected }))
        } else {
          setLoginError('wrong password')
        }
      } catch (e) {
        Logger.debug(e)
        setLoginError(typeof e === 'string' ? e : String(e))
      } finally {
        setLoginLoading(false)
      }
    }, 50)
  }

  // --- Initial load / side effects ---
  useEffect(() => {
    if (addressOptions.length > 0) {
      setSelectedAddress(addressOptions[0].value)
      focusPasswordInput()
    }
  }, [addressOptions])

  useEffect(() => {
    dispatch(loadAccountListStart())
  }, [])

  useEffect(() => {
    if (IsAuth) {
      navigate('/', { replace: true })
    }
  }, [IsAuth])

  return (
    <div className="p-1 mt-8 flex justify-center items-center">
      {/* Generate Account Modal */}
      {showGen && <GenerateAccountModal onClose={() => setShowGen(false)} />}

      {/* Temporary Login Modal */}
      {showTmp && (
        <TempLoginModal
          displaySeed={displaySeed}
          tmpError={tmpError}
          Seed={Seed}
          onClose={() => setShowTmp(false)}
          onSeedUpdate={tmpUpdateSeed}
        />
      )}

      {/* Add Account Modal */}
      {showAdd && (
        <AddAccountModal
          onClose={() => setShowAdd(false)}
          onAddAccount={onAddAccount}
        />
      )}

      {/* Main Login Form */}
      <div className="overflow-y-auto text-text-primary dark:text-dark-text-primary transition-width duration-300 ease-in-out">
        <div className="tab-page">
          <div className="card-title flex flex-row items-center">
            Open Account
            <button className="icon-action-btn" onClick={() => setShowAdd(true)} aria-label="Import account">
              <AiOutlineUserAdd className="card-icon" />
            </button>
            <button className="icon-action-btn" onClick={() => setShowTmp(true)} aria-label="Temporary login">
              <BsIncognito className="card-icon" />
            </button>
            <button className="icon-action-btn" onClick={() => setShowGen(true)} aria-label="Generate new account">
              <CgDice5 className="card-icon" />
            </button>
          </div>
          {addressSelected !== '' ? (
            <div className="!max-w-sm max-w-full w-full mx-auto mb-10">
              <div className="form-card-container">
                <div className="flex flex-col justify-center p-6 space-y-4">
                  <AvatarSelector avatars={addressOptions} defaultIndex={avatarIndex} disableKeyboard={true} onSelect={(address) => {
                    const index = addressOptions.map(a => a.value).indexOf(address)
                    setAvatarIndex(index)
                    setSelectedAddress(address)
                    focusPasswordInput()
                  }} />
                  <div className="mt-1">
                    <SelectInput label={'Address:'} options={addressOptions} selectedOption={addressSelected} onChange={(e) => {
                      setSelectedAddress(e.target.value)
                      const index = addressOptions.map(a => a.value).indexOf(e.target.value)
                      setAvatarIndex(index)
                      focusPasswordInput()
                    }} />
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); if (!loginLoading) login() }} className="flex flex-col">
                    <div className="mt-1">
                      <TextInput ref={passwordRef} label={'Password:'} type='password' value={openPassword} autoComplete={"off"} placeholder={"........"} onChange={(e) => setOpenPassword(e.target.value)} />
                    </div>
                    <FormButton title={loginLoading ? 'Decrypting...' : 'Open Account'} disabled={loginLoading}>
                      {loginLoading && (
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1 align-middle"/>
                      )}
                    </FormButton>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state-box my-4">
              <p className="text-text-secondary dark:text-dark-text-secondary">No saved accounts</p>
            </div>
          )}
          {loginError !== null && (
            <div className="p-4 rounded-xl border border-status-error/30 dark:border-status-error-dark/40 bg-status-error/5 dark:bg-status-error-dark/20 mb-4 max-w-md mx-auto">
              <span className='label-error break-all'>{loginError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
