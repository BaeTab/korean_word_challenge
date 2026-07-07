// -----------------------------------------------------------------------------
// IntroScreen — 게임 시작 전 닉네임 입력 화면
//  - 닉네임을 입력해야 게임/타이머가 시작된다.
//  - 게임 방법 요약 + 실시간 랭킹 미리보기 포함.
// -----------------------------------------------------------------------------
import { useState } from 'react'
import Mascot from './Mascot'
import Leaderboard from './Leaderboard'
import styles from '../styles/Intro.module.css'

export default function IntroScreen({ onStart, defaultNick = '' }) {
  const [nick, setNick] = useState(defaultNick)
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const v = nick.trim()
    if (v.length === 0) {
      setError('닉네임을 입력해야 시작할 수 있어요!')
      return
    }
    onStart(v.slice(0, 12))
  }

  return (
    <div className={styles.intro}>
      <div className={styles.card}>
        <div className={styles.titlebar}>
          <span className={styles.dots}>
            <i style={{ background: '#ff7eb6' }} />
            <i style={{ background: '#ffb454' }} />
            <i style={{ background: '#3ddc97' }} />
          </span>
          <span className={styles.titleText}>~/jamo-wordle · start</span>
        </div>

        <div className={styles.body}>
          <Mascot mood="idle" size={120} className={styles.mascot} />
          <h1 className={styles.title}>
            <span className={styles.prompt}>{'>'}</span> 자모 워들
            <span className={styles.cursor}>_</span>
          </h1>
          <p className={styles.subtitle}>
            한글 자음·모음 낱자를 맞추는 워들 게임 ᕕ( ᐛ )ᕗ
          </p>

          <form className={styles.form} onSubmit={submit}>
            <label className={styles.label} htmlFor="nick">
              <span className={styles.prompt}>$</span> whoami — 닉네임을 정해줘!
            </label>
            <input
              id="nick"
              className={styles.input}
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              placeholder="예) 자모마스터"
              maxLength={12}
              autoFocus
            />
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.startBtn}>
              ▶ 게임 시작!
            </button>
          </form>

          <ul className={styles.rules}>
            <li>🟩 자모 O · 위치 O</li>
            <li>🟨 자모 O · 위치 X</li>
            <li>⬛ 자모 X</li>
          </ul>
          <p className={styles.tip}>
            쌍자음(ㄲ·ㄸ·ㅃ·ㅆ·ㅉ)은 <b>기본 자음 2번</b>! (예: 토<b>끼</b> → …ㄱ ㄱ ㅣ)
          </p>
        </div>
      </div>

      <div className={styles.side}>
        <Leaderboard compact />
      </div>
    </div>
  )
}
