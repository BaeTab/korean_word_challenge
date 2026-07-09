// -----------------------------------------------------------------------------
// 레벨/정답률 유틸 — 참여횟수 기반 레벨 + 정답률 기반 등급.
//  주의: accuracyBpFrom 공식은 firestore.rules의 정수 검증식과 반드시 동일해야
//  서버 검증(int(totalWon*10000/totalPlayed))과 클라이언트 계산이 어긋나지 않는다.
// -----------------------------------------------------------------------------

export const GAMES_PER_LEVEL = 10
const MIN_GAMES_FOR_TIER = 5

/** 참여판수 → 레벨(10판당 1레벨). */
export function levelFromPlayed(totalPlayed) {
  return Math.floor((totalPlayed || 0) / GAMES_PER_LEVEL) + 1
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
