// -----------------------------------------------------------------------------
// CreateRoomModal — 친구와 같은 단어로 겨루는 커스텀 방 생성
//  단어는 게임에서 쓰는 것과 동일한 사전으로 검증(공정성) → 방 생성 → 링크 공유.
// -----------------------------------------------------------------------------
import { useState } from 'react'
import Mascot from './Mascot'
import { decomposeWord, isTypable } from '../utils/hangul'
import { isValidGuess } from '../constants/words'
import { createRoom } from '../services/rooms'
import { shareResult } from '../utils/share'
import styles from '../styles/SuggestWordModal.module.css'

const SITE = 'https://word-challengee.web.app'

export default function CreateRoomModal({ nickname, onDone, onPlay }) {
  const [word, setWord] = useState('')
  const [error, setError] = useState('')
  const [state, setState] = useState('idle') // idle | submitting | done
  const [room, setRoom] = useState(null) // { roomId, word, slots }

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
      setError('자모 5~7칸 단어만 방을 만들 수 있어요.')
      return
    }
    if (!isValidGuess(decomposeWord(v), slots)) {
      setError('사전에 없는 단어예요 — 실제 존재하는 단어로 만들어야 친구도 맞힐 수 있어요.')
      return
    }
    setError('')
    setState('submitting')
    try {
      const roomId = await createRoom({ word: v, slots, creatorNickname: nickname })
      setRoom({ roomId, word: v, slots })
      setState('done')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[createRoom] 실패:', err)
      setError('방 생성에 실패했어요. 잠시 후 다시 시도해 주세요.')
      setState('idle')
    }
  }

  if (state === 'done' && room) {
    const link = `${SITE}/?room=${room.roomId}`
    return (
      <div className={styles.wrap}>
        <Mascot mood="happy" size={80} />
        <h2 className={styles.title}>방 생성 완료! 🔗</h2>
        <p className={styles.desc}>
          코드 <b>{room.roomId}</b> — 링크를 친구에게 보내주세요 (14일간 유효)
        </p>
        <input className={styles.input} value={link} readOnly onFocus={(e) => e.target.select()} />
        <button className={styles.btn} onClick={() => shareResult(link)}>📋 링크 복사·공유</button>
        <button className={styles.btn} onClick={() => onPlay(room.roomId, room.word, room.slots)}>
          🎮 지금 플레이하기
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onDone}>
          닫기
        </button>
      </div>
    )
  }

  return (
    <form className={styles.wrap} onSubmit={submit}>
      <Mascot mood="idle" size={72} />
      <h2 className={styles.title}>커스텀 방 만들기 🔗</h2>
      <p className={styles.desc}>친구가 맞힐 단어를 정해주세요. XP/포인트는 지급되지 않아요.</p>
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
        {state === 'submitting' ? '생성 중…' : '방 만들기'}
      </button>
    </form>
  )
}
