// -----------------------------------------------------------------------------
// Keyboard — 자모 분리 가상 키보드 (두벌식 QWERTY 배치)
//  - 자음은 왼쪽, 모음은 오른쪽으로 그룹을 나눠 배치 (물리 두벌식과 동일)
//  - keyStates(correct/present/absent) 를 키에 실시간 반영
//  - 물리 키보드(두벌식 e.code, Enter, Backspace) 지원
// -----------------------------------------------------------------------------
import { useEffect } from 'react'
import styles from '../styles/Keyboard.module.css'

// 두벌식 배치: 각 줄을 [자음 그룹] | [모음 그룹] 으로 나눈다.
// ㅐ·ㅔ 는 ㅏ+ㅣ, ㅓ+ㅣ 로 입력하므로 별도 키가 없다.
const ROWS = [
  { cons: ['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ'], vow: ['ㅛ', 'ㅕ', 'ㅑ'] },
  { cons: ['ㅁ', 'ㄴ', 'ㅇ', 'ㄹ', 'ㅎ'], vow: ['ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'] },
  { cons: ['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ'], vow: ['ㅠ', 'ㅜ', 'ㅡ'] },
]

// 두벌식 물리 키(e.code) → 자모 매핑 (IME 상태와 무관하게 동작)
const CODE_TO_JAMO = {
  KeyR: 'ㄱ', KeyS: 'ㄴ', KeyE: 'ㄷ', KeyF: 'ㄹ', KeyA: 'ㅁ',
  KeyQ: 'ㅂ', KeyT: 'ㅅ', KeyD: 'ㅇ', KeyW: 'ㅈ', KeyC: 'ㅊ',
  KeyZ: 'ㅋ', KeyX: 'ㅌ', KeyV: 'ㅍ', KeyG: 'ㅎ',
  KeyK: 'ㅏ', KeyI: 'ㅑ', KeyJ: 'ㅓ', KeyU: 'ㅕ', KeyH: 'ㅗ',
  KeyY: 'ㅛ', KeyN: 'ㅜ', KeyB: 'ㅠ', KeyM: 'ㅡ', KeyL: 'ㅣ',
}

const STATE_CLASS = {
  correct: styles.correct,
  present: styles.present,
  absent: styles.absent,
}

export default function Keyboard({ keyStates, onKey, onDelete, onEnter, disabled }) {
  // 물리 키보드 지원
  useEffect(() => {
    const handler = (e) => {
      if (e.repeat) return
      if (e.key === 'Enter') {
        if (!disabled) onEnter()
        return
      }
      if (e.key === 'Backspace') {
        if (!disabled) onDelete()
        return
      }
      const jamo = CODE_TO_JAMO[e.code]
      if (jamo && !disabled) onKey(jamo)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onKey, onDelete, onEnter, disabled])

  const renderKey = (jamo, kind) => (
    <button
      key={jamo}
      type="button"
      className={`${styles.key} ${styles[kind]} ${STATE_CLASS[keyStates[jamo]] || ''}`}
      onClick={() => onKey(jamo)}
      disabled={disabled}
    >
      {jamo}
    </button>
  )

  return (
    <div className={styles.keyboard} aria-label="자모 가상 키보드 (두벌식 배치)">
      {ROWS.map((row, i) => (
        <div key={i} className={styles.row}>
          {/* 마지막 줄 왼쪽 끝: 삭제 */}
          {i === 2 && (
            <button
              type="button"
              className={`${styles.key} ${styles.fn} ${styles.del}`}
              onClick={onDelete}
              disabled={disabled}
              aria-label="지움(백스페이스)"
            >
              ← 지움
            </button>
          )}

          {/* 자음 그룹 (왼쪽) */}
          <div className={styles.group} style={{ flexGrow: row.cons.length }}>
            {row.cons.map((j) => renderKey(j, 'cons'))}
          </div>

          {/* 자음·모음 구분선 */}
          <span className={styles.divider} aria-hidden="true" />

          {/* 모음 그룹 (오른쪽) */}
          <div className={styles.group} style={{ flexGrow: row.vow.length }}>
            {row.vow.map((j) => renderKey(j, 'vow'))}
          </div>

          {/* 마지막 줄 오른쪽 끝: 입력 */}
          {i === 2 && (
            <button
              type="button"
              className={`${styles.key} ${styles.fn} ${styles.enter}`}
              onClick={onEnter}
              disabled={disabled}
              aria-label="입력(엔터)"
            >
              입력 ↵
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
