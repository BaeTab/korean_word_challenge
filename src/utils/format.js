// 시간/숫자 포맷 유틸

/** ms → "m:ss" (예: 72000 → "1:12") */
export function formatTime(ms) {
  const total = Math.floor((ms || 0) / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** 스테이지 번호 → 라벨 */
export function stageLabel(stage) {
  return stage >= 2 ? '6칸·챌린지' : '5칸·기본'
}

/** 순위 메달/번호 */
export function rankBadge(index) {
  return ['🥇', '🥈', '🥉'][index] ?? `${index + 1}`
}
