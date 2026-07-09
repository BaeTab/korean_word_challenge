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
  byMode: { 5: { played: 0, wins: 0 }, 6: { played: 0, wins: 0 }, 7: { played: 0, wins: 0 } },
})

export function loadStats() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}')
    const base = emptyStats()
    return {
      ...base,
      ...s,
      dist: { ...base.dist, ...(s.dist || {}) },
      byMode: {
        5: { ...base.byMode[5], ...(s.byMode?.[5] || {}) },
        6: { ...base.byMode[6], ...(s.byMode?.[6] || {}) },
        7: { ...base.byMode[7], ...(s.byMode?.[7] || {}) },
      },
    }
  } catch {
    return emptyStats()
  }
}

/**
 * 게임 종료 결과를 기록하고 갱신된 통계를 반환.
 * @param {{won:boolean, attempts:number, slots:number}} r
 */
export function recordResult({ won, attempts, slots }) {
  const s = loadStats()
  s.played += 1
  const mode = s.byMode[slots] || (s.byMode[slots] = { played: 0, wins: 0 })
  mode.played += 1
  if (won) {
    s.wins += 1
    mode.wins += 1
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
