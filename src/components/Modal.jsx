// -----------------------------------------------------------------------------
// Modal — 재사용 모달 오버레이 (터미널 창 스타일)
//  - ESC 로 닫기(closable 일 때), 배경 클릭 닫기
//  - 상단 신호등 버튼 + 타이틀바
// -----------------------------------------------------------------------------
import { useEffect } from 'react'
import styles from '../styles/Modal.module.css'

export default function Modal({ open, title = 'terminal', onClose, closable = true, children }) {
  useEffect(() => {
    if (!open || !closable) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, closable, onClose])

  if (!open) return null

  return (
    <div
      className={styles.overlay}
      onClick={() => closable && onClose?.()}
      role="presentation"
    >
      <div
        className={styles.window}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.titlebar}>
          <span className={styles.dots}>
            <i style={{ background: '#ff7eb6' }} />
            <i style={{ background: '#ffb454' }} />
            <i style={{ background: '#3ddc97' }} />
          </span>
          <span className={styles.titleText}>~/{title}</span>
          {closable && (
            <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">
              ×
            </button>
          )}
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
