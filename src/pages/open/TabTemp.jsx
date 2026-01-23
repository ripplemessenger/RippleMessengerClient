import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { loginStart, setUserError } from '../../store/slices/UserSlice'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { getWallet } from '../../lib/AppUtil'
import TextInput from '../../components/Form/TextInput'

export default function TabTemp() {
  const [diplaySeed, setDisplaySeed] = useState('')
  const [seed, setSeed] = useLocalStorage('Seed', '')
  const [address, setAddress] = useLocalStorage('Address', '')

  const { UserError, Seed } = useSelector(state => state.User)

  const navigate = useNavigate()
  const dispatch = useDispatch()

  const updateSeed = (value) => {
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

  return (
    <div className="tab-page">
      {
        Seed === null &&
        <div className="p-6 rounded-lg shadow-xl mb-10">
          <div className="space-y-4 flex flex-col justify-center">
            <div className={`mt-1`}>
              <TextInput label={'Your Seed:'} type='password' value={diplaySeed} autoComplete={"off"} placeholder={"s.................................."} onChange={(e) => updateSeed(e.target.value)} />
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
  )
}