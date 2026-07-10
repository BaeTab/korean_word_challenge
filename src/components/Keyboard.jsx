// -----------------------------------------------------------------------------
// Keyboard — 자모 분리 가상 키보드 (두벌식 QWERTY 배치)
//  - 자음은 왼쪽, 모음은 오른쪽으로 그룹을 나눠 배치 (물리 두벌식과 동일)
//  - keyStates(correct/present/absent) 를 키에 실시간 반영
//  - 물리 키보드(두벌식 e.code, Enter, Backspace) 지원
// -----------------------------------------------------------------------------
import { useEffect } from 'react'
import { playKey, vibrate } from '../utils/sound'
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
  // 키 프레스 피드백(틱 사운드 + 짧은 진동)을 입력/삭제/엔터 공통으로 얹어 실제 액션을 호출.
  const pressFeedback = () => {
    playKey()
    vibrate(8)
  }
  const handleKey = (jamo) => { pressFeedback(); onKey(jamo) }
  const handleDelete = () => { pressFeedback(); onDelete() }
  const handleEnter = () => { pressFeedback(); onEnter() }

  // 물리 키보드 지원
  useEffect(() => {
    const handler = (e) => {
      // 입력창(닉네임 등)에 포커스돼 있으면 기본 동작을 존중 (게임 키 가로채지 않음)
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      // 조합 입력 중이거나 수정키가 눌린 경우도 브라우저 기본 동작을 존중
      if (e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Enter') {
        e.preventDefault()
        if (!e.repeat && !disabled) handleEnter()
        return
      }
      if (e.key === 'Backspace') {
        e.preventDefault() // 브라우저 '뒤로가기' 방지
        if (!disabled) handleDelete()
        return
      }
      if (e.repeat) return
      const jamo = CODE_TO_JAMO[e.code]
      if (jamo && !disabled) {
        e.preventDefault()
        handleKey(jamo)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onKey, onDelete, onEnter, disabled])

  const renderKey = (jamo, kind) => (
    <button
      key={jamo}
      type="button"
      className={`${styles.key} ${styles[kind]} ${STATE_CLASS[keyStates[jamo]] || ''}`}
      onClick={() => handleKey(jamo)}
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
              onClick={handleDelete}
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
              onClick={handleEnter}
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
