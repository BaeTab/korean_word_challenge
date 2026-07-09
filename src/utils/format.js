// 숫자 포맷 유틸

/** 스테이지 번호 → 라벨 */
export function stageLabel(stage) {
  return stage >= 3 ? '7칸·마스터' : stage >= 2 ? '6칸·챌린지' : '5칸·기본'
}

/** 순위 메달/번호 */
export function rankBadge(index) {
  return ['🥇', '🥈', '🥉'][index] ?? `${index + 1}`
}
