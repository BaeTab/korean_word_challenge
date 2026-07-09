// -----------------------------------------------------------------------------
// IntroScreen — 게임 시작 전 닉네임 입력 화면
//  - 닉네임을 입력해야 게임/타이머가 시작된다.
//  - 게임 방법 요약 + 실시간 랭킹 미리보기 포함.
// -----------------------------------------------------------------------------
import { useState } from 'react'
import Mascot from './Mascot'
import Leaderboard from './Leaderboard'
import Stats from './Stats'
import InstallBanner from './InstallBanner'
import { getDailyKey } from '../utils/daily'
import { winRate } from '../utils/stats'
import styles from '../styles/Intro.module.css'

const SLOT_OPTIONS = [
  { slots: 5, label: '5칸 · 기본' },
  { slots: 6, label: '6칸 · 챌린지' },
  { slots: 7, label: '7칸 · 마스터' },
]

export default function IntroScreen({ onStart, onViewDaily, stats, defaultNick = '' }) {
  const [nick, setNick] = useState(defaultNick)
  const [error, setError] = useState('')
  const [showStats, setShowStats] = useState(false)
  const [slots, setSlots] = useState(5)

  const dailyKey = getDailyKey()
  const dailyDoneHere =
    typeof localStorage !== 'undefined' && !!localStorage.getItem(`daily-done-${dailyKey}`)

  const start = (mode) => {
    const v = nick.trim()
    if (v.length === 0) {
      setError('닉네임을 입력해야 시작할 수 있어요!')
      return
    }
    setError('')
    onStart(v.slice(0, 12), mode, slots)
  }
  const onDaily = () => {
    // 이미 오늘 참여했으면 랭킹 열람만
    if (dailyDoneHere) {
      onViewDaily?.()
      return
    }
    start('daily')
  }
  const submit = (e) => {
    e.preventDefault()
    start('normal')
  }

  return (
    <>
      <InstallBanner />
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
              <div className={styles.slotPicker}>
                {SLOT_OPTIONS.map((opt) => (
                  <button
                    key={opt.slots}
                    type="button"
                    className={`${styles.slotBtn} ${slots === opt.slots ? styles.slotBtnActive : ''}`}
                    onClick={() => setSlots(opt.slots)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className={styles.modeBtns}>
                <button type="submit" className={styles.startBtn}>
                  🎮 자유 플레이
                </button>
                <button
                  type="button"
                  className={`${styles.startBtn} ${styles.dailyBtn} ${dailyDoneHere ? styles.dailyDone : ''}`}
                  onClick={onDaily}
                >
                  {dailyDoneHere ? '📊 데일리 랭킹 보기' : '📅 오늘의 챌린지'}
                  {dailyDoneHere && <span className={styles.doneTag}> ✓</span>}
                </button>
              </div>
              <p className={styles.modeHint}>
                {dailyDoneHere
                  ? '오늘의 챌린지는 이미 참여 완료 — 랭킹만 볼 수 있어요 🌙'
                  : <>오늘의 챌린지는 <b>모두 같은 단어(5칸)</b> · <b>닉네임당 하루 1회</b></>}
                {slots === 7 && <><br />7칸 모드는 큐레이션된 <b>42개 후보 단어</b> 기반이에요</>}
              </p>
            </form>

            <ul className={styles.rules}>
              <li>🟩 자모 O · 위치 O</li>
              <li>🟨 자모 O · 위치 X</li>
              <li>⬛ 자모 X</li>
            </ul>
            <p className={styles.tip}>
              쌍자음(ㄲ·ㄸ·ㅃ·ㅆ·ㅉ)은 <b>기본 자음 2번</b>! (예: 토<b>끼</b> → …ㄱ ㄱ ㅣ)
            </p>

            {stats && stats.played > 0 && (
              <div className={styles.myStats}>
                <button
                  type="button"
                  className={styles.statsToggle}
                  onClick={() => setShowStats((v) => !v)}
                >
                  📊 내 기록 · {stats.played}판 · 승률 {winRate(stats)}% · 🔥{stats.streak}
                  <span className={styles.chev}>{showStats ? '▲' : '▼'}</span>
                </button>
                {showStats && <Stats stats={stats} compact />}
              </div>
            )}
          </div>
        </div>

        <div className={styles.side}>
          <Leaderboard compact />
        </div>
      </div>
    </>
  )
}
