// -----------------------------------------------------------------------------
// Profile — 내 프로필 화면: 레벨/XP·정답률 등급·모드별 기록·업적 뱃지·출석 체크
// -----------------------------------------------------------------------------
import { useState } from 'react'
import XpBar from './XpBar'
import { levelTitle, accuracyTier, xpProgress } from '../utils/level'
import { ACHIEVEMENTS, loadAchievements } from '../utils/achievements'
import { hasCheckedInToday } from '../utils/checkin'
import styles from '../styles/Profile.module.css'

const MODE_LABELS = { 5: '5칸·기본', 6: '6칸·챌린지', 7: '7칸·마스터' }

export default function Profile({ nickname, playerStats, localStats, onSuggestWord, onCheckIn, onOpenShop }) {
  const level = playerStats?.level ?? 1
  const xp = playerStats?.xp ?? 0
  const totalPlayed = playerStats?.totalPlayed ?? 0
  const totalWon = playerStats?.totalWon ?? 0
  const accuracyBp = playerStats?.accuracyBp ?? 0
  const points = playerStats?.points ?? 0
  const checkinStreak = playerStats?.checkinStreak ?? 0
  const checkedInToday = hasCheckedInToday(playerStats?.lastCheckinDate)
  const [checkinBusy, setCheckinBusy] = useState(false)
  const { into, span } = xpProgress(xp)
  const tier = accuracyTier(totalPlayed, accuracyBp)
  const { unlocked } = loadAchievements()
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length

  const handleCheckIn = async () => {
    if (checkinBusy || checkedInToday || !onCheckIn) return
    setCheckinBusy(true)
    try {
      await onCheckIn()
    } finally {
      setCheckinBusy(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div className={styles.levelBadge}>Lv.{level}</div>
        <div className={styles.headText}>
          <p className={styles.nick}>{nickname || '익명'}</p>
          <p className={styles.title}>{levelTitle(level)}</p>
        </div>
      </div>

      <XpBar xp={xp} />
      <p className={styles.xpNote}>다음 레벨까지 {Math.max(0, span - into)} XP</p>

      <div className={styles.grid}>
        <Cell label="정답률" value={`${tier.emoji} ${tier.percent != null ? `${tier.percent}%` : tier.name}`} />
        <Cell label="참여" value={`${totalPlayed}판`} />
        <Cell label="정답" value={`${totalWon}판`} />
        <Cell label="업적" value={`${unlockedCount}/${ACHIEVEMENTS.length}`} />
      </div>

      {onOpenShop && (
        <div className={styles.checkinCard}>
          <div className={styles.checkinInfo}>
            <span className={styles.checkinStreak}>🪙 {points} 포인트</span>
            <span className={styles.checkinHint}>정답 맞히면 포인트 적립!</span>
          </div>
          <button type="button" className={styles.checkinBtn} onClick={onOpenShop}>
            🛒 상점
          </button>
        </div>
      )}

      {onCheckIn && (
        <div className={styles.checkinCard}>
          <div className={styles.checkinInfo}>
            <span className={styles.checkinStreak}>🔥 연속 {checkinStreak}일</span>
            <span className={styles.checkinHint}>매일 접속하고 XP를 받아가세요</span>
          </div>
          <button
            type="button"
            className={styles.checkinBtn}
            onClick={handleCheckIn}
            disabled={checkedInToday || checkinBusy}
          >
            {checkedInToday ? '오늘 체크인 완료 ✓' : checkinBusy ? '처리 중…' : '📅 출석 체크'}
          </button>
        </div>
      )}

      {localStats && (
        <div className={styles.section}>
          <p className={styles.sectionTitle}>모드별 기록</p>
          <div className={styles.modeRow}>
            {[5, 6, 7].map((slots) => {
              const m = localStats.byMode?.[slots] || { played: 0, wins: 0 }
              return (
                <div key={slots} className={styles.modeCell}>
                  <span className={styles.modeLabel}>{MODE_LABELS[slots]}</span>
                  <span className={styles.modeValue}>{m.wins}승 / {m.played}판</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <p className={styles.sectionTitle}>업적</p>
        <div className={styles.achGrid}>
          {ACHIEVEMENTS.map((a) => {
            const done = !!unlocked[a.id]
            return (
              <div
                key={a.id}
                className={`${styles.badge} ${done ? styles.badgeDone : styles.badgeLocked}`}
                title={a.desc}
              >
                <span className={styles.badgeEmoji}>{done ? a.emoji : '🔒'}</span>
                <span className={styles.badgeName}>{a.name}</span>
              </div>
            )
          })}
        </div>
      </div>

      {onSuggestWord && (
        <button type="button" className={styles.suggestBtn} onClick={onSuggestWord}>
          💡 단어 제안하기
        </button>
      )}
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
