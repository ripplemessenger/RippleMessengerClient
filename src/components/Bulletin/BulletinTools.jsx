import { useState, useCallback, useRef, memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  IoStar,
  IoStarOutline,
  IoCopyOutline,
  IoArrowRedoOutline,
  IoInformationCircleOutline,
  IoPeopleOutline,
  IoPeople,
  IoCloseOutline
} from 'react-icons/io5'
import { AiOutlineLink } from 'react-icons/ai'
import { MdPostAdd } from 'react-icons/md'
import { useTranslation } from 'react-i18next'
import { FLASH_DURATION_MS } from '../../lib/AppConst'
import { MessageObjectType } from '../../lib/MessengerConst'
import { AddressToName } from '../../lib/MessengerUtil'
import { useClipboard } from '../../hooks/useClipboard'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { setDisplayJson, setFlashNoticeMessage } from '../../store/slices/CommonSlice'
import {
  BulletinMarkToggle,
  BulletinQuote,
  BulletinReply,
  ShowForwardBulletin,
  ContactAdd,
  ContactToggleIsFollow
} from '../../store/sagas/messenger.actions'
import TextInput from '../Form/TextInput'

/**
 * Follow-confirm modal — shown when following an author that has no nickname yet.
 * Requires the user to set a nickname before confirming the follow.
 */
const FollowNicknameModal = ({ address, onConfirm, onCancel }) => {
  const { t } = useTranslation()
  const [nickname, setNickname] = useState('')

  const containerRef = useRef(null)
  const inputRef = useRef(null)
  useFocusTrap(containerRef, inputRef)
  useEscapeKey(onCancel)

  const confirm = () => {
    if (nickname === '') return
    onConfirm(nickname)
  }

  return (
    <div className={`modal-overlay`} role="dialog" aria-modal="true">
      <div ref={containerRef} className="max-w-md w-full mx-4 flex flex-col mt-4">
        <div className="modal-header-bar">
          <span className={`label text-base`}>{t('bulletin.follow_set_nickname')}</span>
          <button
            onClick={onCancel}
            className="p-1 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
            aria-label={t('common.close')}
          >
            <IoCloseOutline className="text-lg text-text-secondary dark:text-dark-text-secondary" />
          </button>
        </div>
        <div className="modal-content-area gap-3">
          <div className="text-sm text-text-secondary dark:text-dark-text-secondary break-all">
            {AddressToName({}, address)}
          </div>
          <TextInput
            label={t('ui.nickname')}
            value={nickname}
            onChange={(e) => setNickname(e.target.value.trim())}
            onKeyDown={(e) => e.key === 'Enter' && confirm()}
            ref={inputRef}
          />
          <div className="flex justify-center gap-2">
            <button className="btn-primary btn-gold max-w-xs" disabled={nickname === ''} onClick={confirm}>
              {t('common.confirm')}
            </button>
            <button className="btn-secondary max-w-xs" onClick={onCancel}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const BulletinTools = ({ address, sequence, hash, content, json, is_marked = false }) => {
  const { t } = useTranslation()

  const myAddress = useSelector((state) => state.User.Address)
  const followList = useSelector((state) => state.User.FollowList)
  const contactMap = useSelector((state) => state.User.ContactMap)

  const [displayMark, setDisplayMark] = useState(is_marked)
  const [displayFollow, setDisplayFollow] = useState(followList.includes(address))
  const [showFollowModal, setShowFollowModal] = useState(false)

  const dispatch = useDispatch()

  const copyText = useClipboard(
    useCallback((msg) => dispatch(setFlashNoticeMessage({ message: msg, duration: FLASH_DURATION_MS })), [dispatch])
  )

  const toggleMarkDisplay = () => {
    setDisplayMark(!displayMark)
  }

  const isOwnBulletin = myAddress === address

  const confirmFollow = (nickname) => {
    dispatch(ContactAdd({ address, nickname }))
    dispatch(ContactToggleIsFollow({ contact_address: address }))
    setShowFollowModal(false)
    dispatch(setFlashNoticeMessage({ message: t('bulletin.follow_success'), duration: FLASH_DURATION_MS }))
  }

  const clickFollow = () => {
    setDisplayFollow(!displayFollow)
    if (displayFollow) {
      // already followed → unfollow, no dialog
      dispatch(ContactToggleIsFollow({ contact_address: address }))
      dispatch(setFlashNoticeMessage({ message: t('bulletin.unfollowed'), duration: FLASH_DURATION_MS }))
      return
    }
    if (contactMap[address]) {
      // has nickname → follow directly, no dialog
      dispatch(ContactToggleIsFollow({ contact_address: address }))
      dispatch(setFlashNoticeMessage({ message: t('bulletin.follow_success'), duration: FLASH_DURATION_MS }))
    } else {
      // no nickname → ask for one before following
      setShowFollowModal(true)
    }
  }

  return (
    <div className={`flex flex-row gap-1`}>
      {!isOwnBulletin && (
        <button className="icon-action-btn" onClick={clickFollow} aria-label={t('common.follow')}>
          {displayFollow ? <IoPeople className="icon-sm" /> : <IoPeopleOutline className="icon-sm" />}
        </button>
      )}
      <button
        className="icon-action-btn"
        onClick={() => {
          dispatch(BulletinMarkToggle({ hash }))
          toggleMarkDisplay()
        }}
        aria-label={displayMark ? t('bulletin.unmark') : t('bulletin.mark')}
      >
        {displayMark ? <IoStar className="icon-sm" /> : <IoStarOutline className="icon-sm" />}
      </button>
      <button
        className="icon-action-btn"
        onClick={() => dispatch(BulletinReply({ Address: address, Sequence: sequence, Hash: hash }))}
        aria-label={t('ui.reply')}
      >
        <MdPostAdd className="icon-sm" />
      </button>
      <button
        className="icon-action-btn"
        onClick={() => dispatch(BulletinQuote({ Address: address, Sequence: sequence, Hash: hash }))}
        aria-label={t('ui.quote')}
      >
        <AiOutlineLink className="icon-sm" />
      </button>
      <button
        className="icon-action-btn"
        onClick={() =>
          dispatch(
            ShowForwardBulletin({
              ObjectType: MessageObjectType.Bulletin,
              Address: address,
              Sequence: sequence,
              Hash: hash
            })
          )
        }
        aria-label={t('common.forward')}
      >
        <IoArrowRedoOutline className="icon-sm" />
      </button>
      <button className="icon-action-btn" onClick={() => copyText(content)} aria-label={t('ui.copy_content')}>
        <IoCopyOutline className="icon-sm" />
      </button>
      <button
        className="icon-action-btn"
        onClick={() => dispatch(setDisplayJson({ json, isExpand: true }))}
        aria-label={t('ui.view_details')}
      >
        <IoInformationCircleOutline className="icon-sm" />
      </button>
      {showFollowModal && (
        <FollowNicknameModal address={address} onConfirm={confirmFollow} onCancel={() => setShowFollowModal(false)} />
      )}
    </div>
  )
}

export default memo(BulletinTools)
