// -----------------------------------------------------------------------------
// 시즌 리셋 (클라이언트) — 새 시즌 시작 시 로컬 기록을 1회 초기화.
//  서버 DB는 CLI로 전체 삭제하므로, 클라이언트도 로컬 통계/업적/데일리 기록을 함께 비워
//  "내 기록 판수 ≠ 랭킹 판수" 불일치가 재발하지 않도록 0에서 같이 시작한다.
// -----------------------------------------------------------------------------

// 가드 키 — 있으면 이미 리셋된 것으로 보고 건너뛴다. 시즌이 바뀌면 이 문자열을 교체.
const GUARD_KEY = 'season-reset-2026-07'

/**
 * 가드 키가 없을 때만 시즌 로컬 기록을 삭제하고 가드 키를 남긴다(브라우저당 1회).
 * localStorage 접근이 막혀 있어도(프라이버시 모드 등) 앱 동작에 지장 없게 전체를 try/catch로 감싼다.
 */
export function runSeasonResetOnce() {
  try {
    if (localStorage.getItem(GUARD_KEY)) return

    // 고정 키 삭제 — 로컬 통계 · 업적 · 이전 레벨 시스템 공지
    localStorage.removeItem('jamo-wordle-stats-v1')
    localStorage.removeItem('jamo-wordle-achievements-v1')
    localStorage.removeItem('notice-level-system-v1')

    // 데일리 참여 잠금은 날짜별(daily-done-YYYY-MM-DD)로 쌓이므로 prefix 순회 삭제
    const toRemove = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith('daily-done-')) toRemove.push(key)
    }
    toRemove.forEach((k) => localStorage.removeItem(k))

    localStorage.setItem(GUARD_KEY, '1')
  } catch {
    /* noop — 리셋에 실패해도 앱은 정상 동작해야 한다 */
  }
}
