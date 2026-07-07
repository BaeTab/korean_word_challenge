// -----------------------------------------------------------------------------
// 개인 통계 (localStorage) — 플레이/승률/연속(스트릭)/시도 분포
// -----------------------------------------------------------------------------
const KEY = 'jamo-wordle-stats-v1'

const emptyStats = () => ({
  played: 0,
  wins: 0,
  streak: 0,
  maxStreak: 0,
  dist: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }, // 승리 시 시도 횟수 분포
})

export function loadStats() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { ...emptyStats(), ...s, dist: { ...emptyStats().dist, ...(s.dist || {}) } }
  } catch {
    return emptyStats()
  }
}

/**
 * 게임 종료 결과를 기록하고 갱신된 통계를 반환.
 * @param {{won:boolean, attempts:number}} r
 */
export function recordResult({ won, attempts }) {
  const s = loadStats()
  s.played += 1
  if (won) {
    s.wins += 1
    s.streak += 1
    s.maxStreak = Math.max(s.maxStreak, s.streak)
    if (attempts >= 1 && attempts <= 6) s.dist[attempts] = (s.dist[attempts] || 0) + 1
  } else {
    s.streak = 0
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* 저장 실패해도 게임엔 영향 없음 */
  }
  return s
}

export function resetStats() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
  return emptyStats()
}

export function winRate(s) {
  return s.played ? Math.round((s.wins / s.played) * 100) : 0
}
