import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { loginStart, setUserError } from '../../store/slices/UserSlice'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { getWallet } from '../../lib/AppUtil'
import TextInput from '../../components/Form/TextInput'
import { genSalt, encryptWithPassword } from '../../lib/AppUtil'

export default function TabAdd() {
  const [seed, setSeed] = useLocalStorage('Seed', '')
  const [address, setAddress] = useLocalStorage('Address', '')

  const [savePassword, setSavePassword] = useState('')
  const [saveSeed, setSaveSeed] = useState('')
  const [saveAddress, setSaveAddress] = useState('')

  const { Seed, UserError } = useSelector(state => state.User)

  const navigate = useNavigate()
  const dispatch = useDispatch()

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
    dispatch({ type: 'LocalAccountAdd', payload: { address: saveAddress, salt: salt, cipher_data: cipherData } })
    setSavePassword('')
    setSaveSeed('')
    if (UserError === null && saveSeed !== '') {
      setSeed(saveSeed)
      setAddress(saveAddress)
      dispatch(loginStart({ seed: saveSeed, address: saveAddress }))
    }
  }

  return (
    <div className="tab-page">
      {
        Seed === null &&
        <div className="p-6 rounded-lg shadow-xl mb-10">
          <div className="space-y-4 flex flex-col justify-center">
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