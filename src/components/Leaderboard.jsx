// -----------------------------------------------------------------------------
// Leaderboard — 실시간 랭킹 보드 (6칸 챌린지 / 5칸 기본 분리)
//  - Firestore onSnapshot 구독으로 실시간 갱신
//  - 스테이지별로 나눠 각각 Top N 표시
//  - highlightId: 방금 등록한 내 문서 강조
// -----------------------------------------------------------------------------
import { useEffect, useState } from 'react'
import { subscribeTopRanking } from '../services/ranking'
import { formatTime, rankBadge } from '../utils/format'
import styles from '../styles/Leaderboard.module.css'

const PER_STAGE = 8

function StageList({ title, icon, rows, highlightId, accent }) {
  return (
    <div className={styles.section}>
      <h3 className={`${styles.sectionTitle} ${accent ? styles.accent : ''}`}>
        {icon} {title}
      </h3>
      {rows.length === 0 ? (
        <p className={styles.empty}>아직 기록이 없어요 — 첫 주인공이 되어보세요!</p>
      ) : (
        <ol className={styles.list}>
          {rows.map((row, i) => (
            <li
              key={row.id}
              className={`${styles.item} ${row.id === highlightId ? styles.mine : ''} ${i < 3 ? styles.top3 : ''}`}
            >
              <span className={styles.rank}>{rankBadge(i)}</span>
              <span className={styles.nick} title={row.nickname}>{row.nickname}</span>
              <span className={styles.stat}>{row.attempts}회</span>
              <span className={styles.stat}>{formatTime(row.timeMs)}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

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
      100,
    )
    return () => unsub()
  }, [])

  const stage6 = rows.filter((r) => r.stage >= 2).slice(0, PER_STAGE)
  const stage5 = rows.filter((r) => r.stage < 2).slice(0, PER_STAGE)

  return (
    <section className={`${styles.wrap} ${compact ? styles.compact : ''}`} aria-label="랭킹 보드">
      <header className={styles.head}>
        <h2 className={styles.title}>
          <span className={styles.prompt}>$</span> ranking --top
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

      {status === 'ready' && (
        <div className={styles.stages}>
          <StageList
            title="6칸 챌린지"
            icon="🔥"
            rows={stage6}
            highlightId={highlightId}
            accent
          />
          <StageList
            title="5칸 기본"
            icon="⭐"
            rows={stage5}
            highlightId={highlightId}
          />
        </div>
      )}
    </section>
  )
}
