// -----------------------------------------------------------------------------
// 레벨/정답률 유틸 — XP 기반 레벨(참여+칸수 난이도+승리 가중치) + 정답률 기반 등급.
//  주의: 아래 공식들은 firestore.rules의 정수 검증식과 반드시 동일해야
//  서버 검증과 클라이언트 계산이 어긋나지 않는다(둘 다 정수 연산만 사용).
//
//  게임 1판당 XP(참여만 해도 조금, 승리 시 칸수(난이도)에 비례해 더 많이):
//   5칸: 패배 10 · 승리 30    6칸: 패배 15 · 승리 45    7칸: 패배 20 · 승리 60
//
//  레벨 임계값(삼각수 공식, 정수 곱셈만 사용 — 나눗셈/제곱근 불필요):
//   레벨 N 도달에 필요한 누적 XP = 25 * N * (N-1)  (1→2:50, 2→3:100, 3→4:150 ...)
// -----------------------------------------------------------------------------

const MIN_GAMES_FOR_TIER = 5

/** 게임 1판의 XP 획득량. slots: 5|6|7, won: 승리 여부. */
export function xpForGame({ slots, won }) {
  const diff = (slots || 5) - 5 // 0, 1, 2
  const participation = 10 + diff * 5
  const winBonus = won ? 20 + diff * 10 : 0
  return participation + winBonus
}

/**
 * 게임 1판 승리 시 상점 포인트 획득량(패배는 0). slots: 5|6|7.
 * XP와 별도 재화 — xpForGame의 승리 XP(30/45/60)에 1:1 대응하는 값으로
 * firestore.rules의 isValidPointsForXp가 xpDelta에서 그대로 파생한다.
 */
export function pointsForGame({ slots, won }) {
  if (!won) return 0
  return { 5: 1, 6: 2, 7: 3 }[slots || 5] ?? 1
}

/** 레벨 N에 도달하기 위한 누적 XP 임계값. */
export function xpThreshold(level) {
  return 25 * level * (level - 1)
}

/** 누적 XP → 현재 레벨. */
export function levelFromXp(xp) {
  let level = 1
  while (xpThreshold(level + 1) <= xp) level++
  return level
}

/** 레벨 진행률(현재 레벨 구간 내 XP 진행 상황). */
export function xpProgress(xp) {
  const level = levelFromXp(xp || 0)
  const cur = xpThreshold(level)
  const next = xpThreshold(level + 1)
  const span = next - cur
  return { level, cur, next, into: (xp || 0) - cur, span, ratio: span ? (xp - cur) / span : 0 }
}

/** 정답률을 만분율 정수로 반환(0~10000). */
export function accuracyBpFrom(totalWon, totalPlayed) {
  if (!totalPlayed) return 0
  return Math.floor((totalWon * 10000) / totalPlayed)
}

const LEVEL_TITLES = [
  [1, '새싹'],
  [3, '도전자'],
  [6, '숙련자'],
  [11, '고수'],
  [21, '마스터'],
]

/** 레벨 구간별 칭호. */
export function levelTitle(level) {
  let title = LEVEL_TITLES[0][1]
  for (const [min, name] of LEVEL_TITLES) {
    if (level >= min) title = name
  }
  return title
}

/** 정답률 등급(뱃지). 표본이 적으면 "언랭크". */
export function accuracyTier(totalPlayed, accuracyBp) {
  if (totalPlayed < MIN_GAMES_FOR_TIER) return { emoji: '🌱', name: '언랭크', percent: null }
  const percent = Math.round(accuracyBp / 100)
  if (accuracyBp >= 9000) return { emoji: '👑', name: '다이아몬드', percent }
  if (accuracyBp >= 7500) return { emoji: '💎', name: '플래티넘', percent }
  if (accuracyBp >= 6000) return { emoji: '🥇', name: '골드', percent }
  if (accuracyBp >= 4000) return { emoji: '🥈', name: '실버', percent }
  return { emoji: '🥉', name: '브론즈', percent }
}
