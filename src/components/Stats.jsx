// -----------------------------------------------------------------------------
// Stats — 개인 통계(요약 + 시도 횟수 분포 막대)
// -----------------------------------------------------------------------------
import { winRate } from '../utils/stats'
import styles from '../styles/Stats.module.css'

export default function Stats({ stats, highlight = -1, compact = false }) {
  const max = Math.max(1, ...Object.values(stats.dist))
  const rows = [1, 2, 3, 4, 5, 6]

  return (
    <div className={`${styles.stats} ${compact ? styles.compact : ''}`} aria-label="내 기록">
      <div className={styles.summary}>
        <Cell label="플레이" value={stats.played} />
        <Cell label="승률" value={`${winRate(stats)}%`} />
        <Cell label="🔥 연속" value={stats.streak} />
        <Cell label="최고연속" value={stats.maxStreak} />
      </div>

      <div className={styles.dist}>
        <p className={styles.distTitle}>시도 횟수 분포</p>
        {rows.map((n) => {
          const c = stats.dist[n] || 0
          const w = Math.round((c / max) * 100)
          return (
            <div key={n} className={styles.row}>
              <span className={styles.num}>{n}</span>
              <div className={styles.track}>
                <div
                  className={`${styles.bar} ${n === highlight ? styles.hi : ''}`}
                  style={{ width: `${Math.max(c ? 10 : 0, w)}%` }}
                >
                  <span className={styles.count}>{c}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Cell({ label, value }) {
  return (
    <div className={styles.cell}>
      <span className={styles.cellValue}>{value}</span>
      <span className={styles.cellLabel}>{label}</span>
    </div>
  )
}
