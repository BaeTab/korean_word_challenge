// -----------------------------------------------------------------------------
// Leaderboard — 실시간 레벨 랭킹 보드 (참여횟수·정답률 기반, 영구 누적)
//  - Firestore onSnapshot 구독으로 실시간 갱신
//  - 정렬: 레벨 desc → 정답률 desc → 참여횟수 desc
//  - highlightId: 내 닉네임 강조
// -----------------------------------------------------------------------------
import { useEffect, useState } from 'react'
import { subscribeTopPlayers } from '../services/players'
import { rankBadge } from '../utils/format'
import { levelTitle, accuracyTier } from '../utils/level'
import styles from '../styles/Leaderboard.module.css'

const TOP_N = 30

export default function Leaderboard({ highlightId, compact = false }) {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error

  useEffect(() => {
    const unsub = subscribeTopPlayers(
      (data) => {
        setRows(data)
        setStatus('ready')
      },
      () => setStatus('error'),
      TOP_N,
    )
    return () => unsub()
  }, [])

  return (
    <section className={`${styles.wrap} ${compact ? styles.compact : ''}`} aria-label="랭킹 보드">
      <header className={styles.head}>
        <h2 className={styles.title}>
          <span className={styles.prompt}>$</span> ranking --level
        </h2>
        <span className={styles.live}>
          <i className={styles.dot} /> LIVE
        </span>
      </header>

      {status === 'loading' && (
        <p className={styles.hint}>랭킹 불러오는 중… <span className={styles.blink}>▍</span></p>
      )}

      {status === 'error' && (
        <p className={styles.error}>
          랭킹을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          <br />
          (Firestore 색인 생성 중일 수 있어요)
        </p>
      )}

      {status === 'ready' && rows.length === 0 && (
        <p className={styles.empty}>아직 기록이 없어요 — 첫 주인공이 되어보세요!</p>
      )}

      {status === 'ready' && rows.length > 0 && (
        <ol className={styles.list}>
          {rows.map((row, i) => {
            const tier = accuracyTier(row.totalPlayed, row.accuracyBp)
            return (
              <li
                key={row.id}
                className={`${styles.item} ${row.id === highlightId ? styles.mine : ''} ${i < 3 ? styles.top3 : ''}`}
              >
                <span className={styles.rank}>{rankBadge(i)}</span>
                <span className={styles.nick} title={row.nickname}>{row.nickname}</span>
                <span className={styles.badge}>Lv.{row.level} {levelTitle(row.level)}</span>
                <span className={styles.stat}>
                  {tier.emoji} {tier.percent != null ? `${tier.percent}%` : tier.name}
                </span>
                <span className={styles.stat}>{row.totalPlayed}판</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
