import { useEffect, useRef, useState } from 'react'
import { IoCloseOutline } from 'react-icons/io5'

import TextInput from '../components/Form/TextInput'
import FormButton from '../components/Form/FormButton'
import Logger from '../lib/Logger'
import { genSalt, encryptWithPassword } from '../lib/AppUtil'
import { getWallet } from '../lib/RippleUtil'

/**
 * AddAccountModal - Form for importing an existing account by seed.
 * Props:
 *   onClose            - () => void
 *   onAddAccount       - ({ seed, address, salt, cipher_data }) => void  called on successful encryption
 */
export default function AddAccountModal({ onClose, onAddAccount }) {
  const [savePassword, setSavePassword] = useState('')
  const [saveSeed, setSaveSeed] = useState('')
  const [saveAddress, setSaveAddress] = useState('')
  const [addError, setAddError] = useState(null)
  const [addLoading, setAddLoading] = useState(false)

  const addSeedRef = useRef(null)

  useEffect(() => {
    addSeedRef.current?.focus()
  }, [])

  const updateSeed = (value) => {
    value = value.trim()
    setSaveSeed(value)
    setSaveAddress('')
    setAddError(null)

    if (value !== '') {
      try {
        const wallet = getWallet(value)
        setSaveAddress(wallet.classicAddress)
      } catch (error) {
        Logger.debug(error)
        setAddError(error.message)
      }
    }
  }

  const addAccount = () => {
    if (saveSeed === '' || savePassword.trim() === '') return
    setAddLoading(true)
    // Yield to UI so loading spinner renders before blocking crypto
    setTimeout(() => {
      try {
        const salt = genSalt()
        const cipherData = encryptWithPassword(saveSeed, savePassword, salt)
        onAddAccount({ seed: saveSeed, address: saveAddress, salt, cipher_data: cipherData })
        setSavePassword('')
        setSaveSeed('')
      } catch (e) {
        Logger.error('[addAccount] encryption failed:', e.message)
        setAddError(e.message)
      } finally {
        setAddLoading(false)
      }
    }, 50)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-action-row">
        <button onClick={onClose} className="modal-btn-gray">
          <IoCloseOutline className="icon" /> cancel
        </button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); addAccount() }} className="space-y-4 flex flex-col justify-center mt-1">
        <div className="card-title flex flex-row items-center">
          Add Account
        </div>
        <div className="mt-1">
          <TextInput ref={addSeedRef} label={'Your Seed:'} type='password' value={saveSeed} autoComplete={"off"} placeholder={"s.................................."} onChange={(e) => updateSeed(e.target.value)} />
        </div>
        <div className={`mt-1 ${saveSeed === '' ? 'hidden' : ''}`}>
          <TextInput label={'Address:'} value={saveAddress} disabled={true} autoComplete={"off"} placeholder={"r.................................."} />
        </div>
        {addError !== null && (
          <div className="p-3 rounded-xl border border-status-error/30 dark:border-status-error-dark/40 bg-status-error/5 dark:bg-status-error-dark/20">
            <span className='label-error break-all'>{addError}</span>
          </div>
        )}
        <div className="mt-1">
          <TextInput label={'Password:'} type='password' value={savePassword} autoComplete={"off"} placeholder={"........"} onChange={(e) => setSavePassword(e.target.value)} />
        </div>
        <FormButton title={addLoading ? 'Encrypting...' : 'Add Account'} disabled={saveSeed === '' || savePassword.trim() === '' || addLoading}>
          {addLoading && (
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1 align-middle"/>
          )}
        </FormButton>
      </form>
    </div>
  )
}
