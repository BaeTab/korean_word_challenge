// -----------------------------------------------------------------------------
// DailyBoard — 오늘의 데일리 챌린지 랭킹 + 다음 챌린지까지 카운트다운
// -----------------------------------------------------------------------------
import { useEffect, useState } from 'react'
import { subscribeDailyRanking } from '../services/ranking'
import { rankBadge } from '../utils/format'
import { msUntilNextKstMidnight, formatCountdown } from '../utils/daily'
import styles from '../styles/Leaderboard.module.css'

export default function DailyBoard({ dateKey, highlightId, compact = false }) {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading')
  const [countdown, setCountdown] = useState(msUntilNextKstMidnight())

  useEffect(() => {
    const unsub = subscribeDailyRanking(
      dateKey,
      (data) => { setRows(data); setStatus('ready') },
      () => setStatus('error'),
      10,
    )
    return () => unsub()
  }, [dateKey])

  useEffect(() => {
    const id = setInterval(() => setCountdown(msUntilNextKstMidnight()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <section className={`${styles.wrap} ${compact ? styles.compact : ''}`} aria-label="데일리 랭킹">
      <header className={styles.head}>
        <h2 className={styles.title}>
          <span className={styles.prompt}>$</span> daily --{dateKey}
        </h2>
        <span className={styles.live}><i className={styles.dot} /> LIVE</span>
      </header>

      <p className={styles.countdown}>다음 챌린지까지 ⏳ <b>{formatCountdown(countdown)}</b></p>

      {status === 'loading' && <p className={styles.hint}>불러오는 중… <span className={styles.blink}>▍</span></p>}
      {status === 'error' && <p className={styles.error}>랭킹을 불러오지 못했어요 (색인 생성 중일 수 있어요)</p>}
      {status === 'ready' && rows.length === 0 && (
        <p className={styles.empty}>오늘의 첫 도전자가 되어보세요! 🎯</p>
      )}
      {status === 'ready' && rows.length > 0 && (
        <ol className={styles.list}>
          {rows.map((row, i) => (
            <li
              key={row.id}
              className={`${styles.item} ${row.id === highlightId ? styles.mine : ''} ${i < 3 ? styles.top3 : ''}`}
            >
              <span className={styles.rank}>{rankBadge(i)}</span>
              <span className={styles.nick} title={row.nickname}>{row.nickname}</span>
              <span className={styles.stat}>{row.attempts}회</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
