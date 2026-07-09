// -----------------------------------------------------------------------------
// SuggestWordModal — 정답 후보 단어 제안 폼
//  제출된 단어는 자동 반영되지 않고, 개발자가 검토 후 정답 풀에 반영한다.
// -----------------------------------------------------------------------------
import { useState } from 'react'
import Mascot from './Mascot'
import { decomposeWord, isTypable } from '../utils/hangul'
import { WORD_LIST_5, WORD_LIST_6, WORD_LIST_7 } from '../constants/words'
import { submitSuggestion } from '../services/suggestions'
import styles from '../styles/SuggestWordModal.module.css'

const EXISTING = {
  5: new Set(WORD_LIST_5),
  6: new Set(WORD_LIST_6),
  7: new Set(WORD_LIST_7),
}

export default function SuggestWordModal({ nickname, onDone }) {
  const [word, setWord] = useState('')
  const [error, setError] = useState('')
  const [state, setState] = useState('idle') // idle | submitting | done

  const submit = async (e) => {
    e.preventDefault()
    const v = word.trim()
    if (!v) {
      setError('단어를 입력해 주세요!')
      return
    }
    if (!/^[가-힣]{2,4}$/.test(v)) {
      setError('완성형 한글 2~4글자로 입력해 주세요.')
      return
    }
    if (!isTypable(v)) {
      setError('가상 키보드로 입력할 수 없는 자모가 포함돼 있어요(복합모음 등).')
      return
    }
    const slots = decomposeWord(v).length
    if (slots < 5 || slots > 7) {
      setError('자모 5~7칸 단어만 제안할 수 있어요.')
      return
    }
    if (EXISTING[slots]?.has(v)) {
      setError('이미 정답 후보에 있는 단어예요! 🙂')
      return
    }
    setError('')
    setState('submitting')
    try {
      await submitSuggestion({ word: v, slots, nickname })
      setState('done')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[suggest] 제출 실패:', err)
      setError('제출에 실패했어요. 잠시 후 다시 시도해 주세요.')
      setState('idle')
    }
  }

  if (state === 'done') {
    return (
      <div className={styles.wrap}>
        <Mascot mood="happy" size={80} />
        <h2 className={styles.title}>제안 완료! 🎉</h2>
        <p className={styles.desc}>검토 후 정답 후보에 반영될 수 있어요. 제안해줘서 고마워요!</p>
        <button className={styles.btn} onClick={onDone}>확인</button>
      </div>
    )
  }

  return (
    <form className={styles.wrap} onSubmit={submit}>
      <Mascot mood="idle" size={72} />
      <h2 className={styles.title}>단어 제안하기 💡</h2>
      <p className={styles.desc}>정답으로 나왔으면 하는 단어를 제안해 주세요.</p>
      <input
        className={styles.input}
        value={word}
        onChange={(e) => setWord(e.target.value)}
        placeholder="예) 무지개"
        maxLength={4}
        autoFocus
      />
      {error && <p className={styles.error}>{error}</p>}
      <button className={styles.btn} type="submit" disabled={state === 'submitting'}>
        {state === 'submitting' ? '제출 중…' : '제안하기'}
      </button>
    </form>
  )
}
