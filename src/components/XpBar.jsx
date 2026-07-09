// -----------------------------------------------------------------------------
// XpBar — 현재 레벨 구간 내 XP 진행률 막대(헤더용 compact / 프로필용 상세)
// -----------------------------------------------------------------------------
import { xpProgress } from '../utils/level'
import styles from '../styles/XpBar.module.css'

export default function XpBar({ xp, compact = false }) {
  const { into, span, ratio } = xpProgress(xp || 0)
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)))
  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ''}`}>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
      {!compact && <span className={styles.label}>{into} / {span} XP</span>}
    </div>
  )
}
