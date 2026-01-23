import { useState } from 'react'
import { Wallet, ECDSA } from 'xrpl'
import TextInput from '../../components/Form/TextInput'
import { getWallet } from '../../lib/AppUtil'

export default function TabGenNew() {
  const [newSeed, setNewSeed] = useState('')
  const [newAddress, setNewAddress] = useState('')

  const genNewAccount = async () => {
    const tmp = Wallet.generate(ECDSA.secp256k1)
    setNewSeed(tmp.seed)
    const wallet = getWallet(tmp.seed)
    setNewAddress(wallet.classicAddress)
  }

  return (
    <div className="tab-page">
      <div className="p-2 rounded-lg shadow-xl mb-10">
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
  )
}