// -----------------------------------------------------------------------------
// 데일리 챌린지 유틸 — 한국 시간(KST) 기준 '오늘의 단어'와 카운트다운
//  - 모두가 같은 날 같은 단어를 풀도록 날짜를 시드로 사용(결정적).
// -----------------------------------------------------------------------------

const KST_OFFSET = 9 * 60 * 60 * 1000

/** KST 기준 날짜키 'YYYY-MM-DD' (offsetDays로 다음날 등 계산) */
export function getDailyKey(offsetDays = 0) {
  const d = new Date(Date.now() + KST_OFFSET + offsetDays * 86400000)
  return d.toISOString().slice(0, 10)
}

/** 문자열 해시(djb2 변형) → 부호 없는 32bit */
export function hashStr(s) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0
  return h >>> 0
}

/** 날짜키로 리스트에서 결정적 인덱스 선택 */
export function seededPick(list, dateKey) {
  if (!list.length) return undefined
  return list[hashStr(dateKey) % list.length]
}

/** KST 다음 자정까지 남은 ms */
export function msUntilNextKstMidnight() {
  const now = new Date(Date.now() + KST_OFFSET)
  const next = new Date(now)
  next.setUTCHours(24, 0, 0, 0)
  return next.getTime() - now.getTime()
}

/** ms → "HH:MM:SS" */
export function formatCountdown(ms) {
  const t = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}
