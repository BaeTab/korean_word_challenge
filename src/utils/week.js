// -----------------------------------------------------------------------------
// 주간 랭킹 유틸 — 한국 시간(KST) 기준 이번 주 키(월요일 00시 초기화)
// -----------------------------------------------------------------------------

const KST_OFFSET = 9 * 60 * 60 * 1000

/** KST 기준 이번 주 월요일 날짜키 'YYYY-MM-DD' */
export function getWeekKey() {
  const kstNow = new Date(Date.now() + KST_OFFSET)
  const day = kstNow.getUTCDay() // 0=일 1=월 ... 6=토
  const diffToMonday = (day + 6) % 7 // 이번 주 월요일로부터 며칠 지났는지
  const monday = new Date(kstNow)
  monday.setUTCDate(monday.getUTCDate() - diffToMonday)
  return monday.toISOString().slice(0, 10)
}

/** KST 기준 다음 월요일 00시까지 남은 ms */
export function msUntilNextWeekReset() {
  const now = new Date(Date.now() + KST_OFFSET)
  const day = now.getUTCDay()
  const daysUntilNextMonday = ((1 - day + 7) % 7) || 7
  const next = new Date(now)
  next.setUTCDate(next.getUTCDate() + daysUntilNextMonday)
  next.setUTCHours(0, 0, 0, 0)
  return next.getTime() - now.getTime()
}

/** ms → "D일 HH:MM:SS" (하루 미만이면 "HH:MM:SS") */
export function formatWeekCountdown(ms) {
  const t = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(t / 86400)
  const h = Math.floor((t % 86400) / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const pad = (n) => String(n).padStart(2, '0')
  return days > 0 ? `${days}일 ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`
}
