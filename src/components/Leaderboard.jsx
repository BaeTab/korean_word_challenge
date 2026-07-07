// -----------------------------------------------------------------------------
// Leaderboard — 실시간 Top 10 랭킹 보드
//  - Firestore onSnapshot 구독으로 실시간 갱신
//  - highlightId: 방금 등록한 내 문서 강조
// -----------------------------------------------------------------------------
import { useEffect, useState } from 'react'
import { subscribeTopRanking } from '../services/ranking'
import { formatTime, rankBadge, stageLabel } from '../utils/format'
import styles from '../styles/Leaderboard.module.css'

export default function Leaderboard({ highlightId, compact = false }) {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error

  useEffect(() => {
    const unsub = subscribeTopRanking(
      (data) => {
        setRows(data)
        setStatus('ready')
      },
      () => setStatus('error'),
      10,
    )
    return () => unsub()
  }, [])

  return (
    <section className={`${styles.wrap} ${compact ? styles.compact : ''}`} aria-label="랭킹 보드">
      <header className={styles.head}>
        <h2 className={styles.title}>
          <span className={styles.prompt}>$</span> ranking --top 10
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
          랭킹을 불러오지 못했어요. Firestore 복합 인덱스가 필요할 수 있어요.
          <br />
          (콘솔의 인덱스 생성 링크를 눌러 주세요 · README 참고)
        </p>
      )}

      {status === 'ready' && rows.length === 0 && (
        <p className={styles.hint}>
          아직 아무도 없어요! 첫 클리어의 주인공이 되어보세요 <b>ヽ(°〇°)ﾉ</b>
        </p>
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
              <span className={`${styles.badge} ${row.stage >= 2 ? styles.challenge : ''}`}>
                {stageLabel(row.stage)}
              </span>
              <span className={styles.stat}>{row.attempts}회</span>
              <span className={styles.stat}>{formatTime(row.timeMs)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
