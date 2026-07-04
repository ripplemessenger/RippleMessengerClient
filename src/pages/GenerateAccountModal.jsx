import { useState, useCallback } from 'react'
import { IoCloseOutline, IoCopyOutline } from 'react-icons/io5'
import { ECDSA, Wallet } from 'xrpl'

import { getWallet } from '../lib/RippleUtil'
import FormButton from '../components/Form/FormButton'

/**
 * GenerateAccountModal - Lets users generate a new XRP account and copy seed/address.
 * Props: onClose () => void
 */
export default function GenerateAccountModal({ onClose }) {
  const [newSeed, setNewSeed] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [copiedField, setCopiedField] = useState(null)

  const genNewAccount = useCallback(() => {
    const tmp = Wallet.generate(ECDSA.secp256k1)
    setNewSeed(tmp.seed)
    const wallet = getWallet(tmp.seed)
    setNewAddress(wallet.classicAddress)
  }, [])

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(label)
      setTimeout(() => setCopiedField(null), 1500)
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-action-row">
        <button onClick={onClose} className="modal-btn-gray">
          <IoCloseOutline className="icon" /> cancel
        </button>
      </div>
      <div className="min-w-80 space-y-4 flex flex-col justify-center mt-1">
        <div className="card-title flex flex-row items-center">
          Generate
        </div>
        <div className="w-full flex flex-col justify-center">
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
  )
}
