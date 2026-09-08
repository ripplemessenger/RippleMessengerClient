import { useRef, useState } from 'react'
import { useEscapeKey } from '../hooks/useEscapeKey'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { IoCloseOutline } from 'react-icons/io5'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import QRCode from 'qrcode'

import TextInput from '../components/Form/TextInput'
import FormButton from '../components/Form/FormButton'
import Logger from '../lib/Logger'
import { genSalt, encryptWithPasswordIterations } from '../lib/AppUtil'

/**
 * SeedQRModal - Export the current account's seed as a password-protected QR code for the App.
 *
 * Flow:
 *   1. Seed is already in memory (Redux store) from login
 *   2. User enters a password to encrypt the seed for the App
 *   3. Client encrypts the seed with the password at 2000 iterations (App convention)
 *   4. QR content: { v: 1, addr, salt, ct, iter: 2000 }
 *   5. App scans QR, enters the same password, decrypts with 2000 iterations
 *
 * Props:
 *   onClose      - () => void
 */
export default function SeedQRModal({ onClose }) {
  const { t } = useTranslation()
  const { Address, Seed } = useSelector((state) => state.User)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState(null)

  const passwordRef = useRef(null)
  const dialogRef = useRef(null)

  useEscapeKey(onClose)
  useFocusTrap(dialogRef, passwordRef)

  const generateQR = () => {
    if (!Seed || password.trim() === '') return
    setLoading(true)
    setError(null)
    // Yield to UI so loading spinner renders before blocking crypto
    setTimeout(() => {
      try {
        // 1. Encrypt seed with user's password at 2000 iterations (App convention)
        const newSalt = genSalt()
        const ct = encryptWithPasswordIterations(Seed, password, newSalt, 2000)

        // 2. Build QR payload
        const payload = JSON.stringify({ v: 1, addr: Address, salt: newSalt, ct, iter: 2000 })

        // 3. Render QR
        QRCode.toDataURL(payload, { width: 280, margin: 2, errorCorrectionLevel: 'M' })
          .then((url) => {
            setQrDataUrl(url)
          })
          .catch((e) => {
            Logger.error('[SeedQR] QR render failed:', e.message)
            setError(e.message)
          })
      } catch (e) {
        Logger.error('[SeedQR] encrypt failed:', e.message)
        setError(typeof e === 'string' ? e : String(e.message))
      } finally {
        setLoading(false)
      }
    }, 50)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div ref={dialogRef} className="max-w-md w-full mx-4 flex flex-col">
        <div className="modal-header-bar">
          <span className={`label text-base`}>{t('setting.seed_qr_title')}</span>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
            aria-label={t('common.close')}
          >
            <IoCloseOutline className="text-lg text-text-secondary dark:text-dark-text-secondary" />
          </button>
        </div>
        <div className="modal-content-area gap-3">
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary">{t('setting.seed_qr_desc')}</p>

          {/* Current account (read-only) */}
          <div className="mt-1">
            <label className="label block mb-1">{t('auth.address')}</label>
            <div className="w-full px-3 py-2 rounded-xl border border-primary/20 dark:border-primary/30 bg-surface-alt/50 dark:bg-dark-surface-alt/50 text-sm break-all">
              {Address}
            </div>
          </div>

          {/* Password input */}
          <div className="mt-1">
            <TextInput
              ref={passwordRef}
              label={t('auth.password')}
              type="password"
              value={password}
              autoComplete={'off'}
              placeholder={'........'}
              onChange={(e) => {
                setPassword(e.target.value)
                setQrDataUrl(null)
                setError(null)
              }}
            />
          </div>

          {error !== null && (
            <div className="p-3 rounded-xl border border-status-error/30 dark:border-status-error-dark/40 bg-status-error/5 dark:bg-status-error-dark/20">
              <span className="label-error break-all">{error}</span>
            </div>
          )}

          {/* QR display or generate button */}
          {qrDataUrl ? (
            <div className="flex flex-col items-center gap-2 mt-2">
              <img src={qrDataUrl} alt="Seed QR" className="w-64 h-64" />
              <span className="text-xs text-text-secondary dark:text-dark-text-secondary break-all text-center">
                {Address}
              </span>
              <span className="text-xs text-text-secondary dark:text-dark-text-secondary">
                {t('setting.seed_qr_hint')}
              </span>
            </div>
          ) : (
            <FormButton
              title={loading ? t('auth.decrypting') : t('setting.seed_qr_generate')}
              disabled={password.trim() === '' || loading}
              onClick={generateQR}
            >
              {loading && (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1 align-middle" />
              )}
            </FormButton>
          )}
        </div>
      </div>
    </div>
  )
}
